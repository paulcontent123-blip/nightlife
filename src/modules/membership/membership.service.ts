import { randomBytes } from "crypto";
import {
    hasMomoCredentials,
    hasVnpayCredentials,
    paymentConfig,
} from "@/config/payments";
import { createSiteUrl } from "@/config/site";
import { AuthException } from "@/modules/auth/auth.errors";
import type { UserProfile } from "@/modules/auth/auth.types";
import { MembershipNotificationService } from "@/modules/notifications/membership-notification.service";
import type { PaymentIpnDTO, PaymentProvider } from "@/modules/payments/payment.types";
import { MEMBERSHIP_TIERS } from "./membership.constants";
import { MembershipRepository } from "./membership.repository";
import {
    AdminMembershipSubscriptionQuerySchema,
    SubscribeMembershipSchema,
} from "./membership.validator";
import type {
    MembershipPaymentMethod,
    MembershipSubscriptionStatus,
    PaidMembershipTierKey,
    SubscribeMembershipDTO,
} from "./membership.types";

export class MembershipService {
    constructor(
        private repository = new MembershipRepository(),
        private notificationService = new MembershipNotificationService()
    ) { }

    listTiers() {
        return {
            items: [
                MEMBERSHIP_TIERS.free,
                MEMBERSHIP_TIERS.night_pass,
                MEMBERSHIP_TIERS.black_card,
            ],
            payment_required_tiers: ["night_pass", "black_card"],
            note: "Payment success only marks a subscription as received. Admin confirmation is required before membership activation.",
        };
    }

    async getMine(userId: string) {
        const [mine, activeSubscription, pendingSubscription] = await Promise.all([
            this.repository.findMine(userId),
            this.repository.findLatestSubscriptionByStatuses(userId, ["active"]),
            this.repository.findLatestSubscriptionByStatuses(userId, ["pending_payment", "payment_received"]),
        ]);

        return {
            ...mine,
            membership: {
                ...mine.membership,
                auto_renewal: activeSubscription?.auto_renewal ?? null,
                pending_confirmation: pendingSubscription?.status === "payment_received",
            },
            pending_subscription: pendingSubscription,
            active_subscription: activeSubscription,
        };
    }

    async subscribe(input: SubscribeMembershipDTO, user: UserProfile) {
        const dto = SubscribeMembershipSchema.parse(input);
        const tier = MEMBERSHIP_TIERS[dto.tier];
        const mine = await this.repository.findMine(user.id);

        if (mine.membership.tier === dto.tier && mine.membership.status === "active") {
            throw new AuthException(409, "MEMBERSHIP_ALREADY_ACTIVE");
        }

        const openSubscription = await this.repository.findOpenSubscription(user.id);

        if (openSubscription) {
            throw new AuthException(
                409,
                "MEMBERSHIP_PAYMENT_PENDING",
                "User already has an open membership subscription. Complete payment or wait for admin confirmation before creating another subscription."
            );
        }

        const subscription = await this.repository.createSubscription({
            user_id: user.id,
            tier: dto.tier,
            amount: tier.price_vnd,
            status: "pending_payment",
            payment_method: dto.payment_method,
            payment_ref: this.createPaymentRef(dto.payment_method, dto.tier),
            auto_renewal: true,
        });

        return this.createSubscribeResponse(subscription, dto.payment_method, false);
    }

    async handlePaymentReceived(provider: PaymentProvider, input: PaymentIpnDTO) {
        const subscription = await this.repository.findSubscriptionByPaymentRef(input.payment_ref);

        if (!subscription) {
            throw new AuthException(404, "PAYMENT_NOT_FOUND");
        }

        if (input.membership_subscription_id && subscription.id !== input.membership_subscription_id) {
            throw new AuthException(404, "MEMBERSHIP_SUBSCRIPTION_NOT_FOUND");
        }

        if (subscription.amount !== input.amount) {
            throw new AuthException(400, "MEMBERSHIP_PAYMENT_AMOUNT_MISMATCH");
        }

        if (subscription.status === "payment_received" || subscription.status === "active") {
            return {
                provider,
                subscription,
                idempotent: true,
                message: subscription.status === "active"
                    ? "Membership subscription is already active."
                    : "Membership payment was already received and is waiting for admin confirmation.",
            };
        }

        if (subscription.status !== "pending_payment") {
            throw new AuthException(409, "MEMBERSHIP_PAYMENT_INVALID_STATUS");
        }

        if (input.status !== "success") {
            return {
                provider,
                subscription,
                status: "ignored",
                message: "Mock payment failed. Membership subscription remains pending payment.",
            };
        }

        const paymentReceivedSubscription = await this.repository.updateSubscription(subscription.id, {
            status: "payment_received",
            payment_method: provider,
        });

        await this.notificationService.sendPaymentReceived(paymentReceivedSubscription);

        return {
            provider,
            subscription: paymentReceivedSubscription,
            idempotent: false,
            status: "received_pending_admin_confirm",
            message: "Payment received. Membership is waiting for admin confirmation.",
        };
    }

    async listAdminSubscriptions(searchParams: URLSearchParams) {
        const query = AdminMembershipSubscriptionQuerySchema.parse(Object.fromEntries(searchParams));

        return this.repository.listSubscriptions(query);
    }

    async confirmSubscription(subscriptionId: string) {
        const subscription = await this.repository.findSubscriptionById(subscriptionId);

        if (!subscription) {
            throw new AuthException(404, "MEMBERSHIP_SUBSCRIPTION_NOT_FOUND");
        }

        if (subscription.status !== "payment_received") {
            throw new AuthException(409, "MEMBERSHIP_CANNOT_BE_CONFIRMED");
        }

        const now = new Date();
        const expiresAt = addMonths(now, 1).toISOString();
        const startsAt = now.toISOString();

        await this.repository.expireActiveSubscriptions(subscription.user_id, subscription.id, startsAt);
        await this.repository.activateUserMembership(subscription.user_id, subscription.tier, expiresAt);

        const activeSubscription = await this.repository.updateSubscription(subscription.id, {
            status: "active",
            starts_at: startsAt,
            expires_at: expiresAt,
            confirmed_at: startsAt,
        });

        await this.notificationService.sendActivated(activeSubscription);

        return activeSubscription;
    }

    async rejectSubscription(subscriptionId: string) {
        const subscription = await this.repository.findSubscriptionById(subscriptionId);

        if (!subscription) {
            throw new AuthException(404, "MEMBERSHIP_SUBSCRIPTION_NOT_FOUND");
        }

        if (!isRejectableStatus(subscription.status)) {
            throw new AuthException(409, "MEMBERSHIP_PAYMENT_INVALID_STATUS");
        }

        return this.repository.updateSubscription(subscription.id, {
            status: "rejected",
            auto_renewal: false,
            cancelled_at: new Date().toISOString(),
        });
    }

    async cancelAutoRenewal(userId: string) {
        const subscription = await this.repository.findLatestSubscriptionByStatuses(userId, ["active"]);

        if (!subscription) {
            throw new AuthException(404, "MEMBERSHIP_SUBSCRIPTION_NOT_FOUND");
        }

        if (!subscription.auto_renewal) {
            return subscription;
        }

        return this.repository.updateSubscription(subscription.id, {
            auto_renewal: false,
            cancelled_at: new Date().toISOString(),
        });
    }

    private createSubscribeResponse(
        subscription: Awaited<ReturnType<MembershipRepository["createSubscription"]>>,
        paymentMethod: MembershipPaymentMethod,
        reused: boolean
    ) {
        const mode = this.resolveProviderMode(paymentMethod);

        return {
            subscription,
            payment: {
                provider: paymentMethod,
                mode,
                purpose: "membership",
                amount: subscription.amount,
                payment_ref: subscription.payment_ref,
                payment_url: this.createMockPaymentUrl(
                    paymentMethod,
                    subscription.id,
                    subscription.tier,
                    subscription.payment_ref,
                    subscription.amount
                ),
                note: mode === "mock"
                    ? "Mock payment URL generated because sandbox credentials are not active or PAYMENT_MODE=mock."
                    : "Sandbox credentials detected, but this phase currently returns a mock-compatible payment URL.",
            },
            reused_pending_subscription: reused,
            next_step: "Complete payment. Membership remains inactive until admin confirms after payment reconciliation.",
        };
    }

    private resolveProviderMode(provider: MembershipPaymentMethod) {
        if (paymentConfig.mode === "mock") {
            return "mock";
        }

        const hasCredentials = provider === "vnpay"
            ? hasVnpayCredentials()
            : hasMomoCredentials();

        return hasCredentials ? paymentConfig.mode : "mock";
    }

    private createPaymentRef(provider: MembershipPaymentMethod, tier: PaidMembershipTierKey) {
        return `MOCK_${provider.toUpperCase()}_MEMBERSHIP_${tier.toUpperCase()}_${randomBytes(4).toString("hex").toUpperCase()}`;
    }

    private createMockPaymentUrl(
        provider: MembershipPaymentMethod,
        subscriptionId: string,
        tier: PaidMembershipTierKey,
        paymentRef: string,
        amount: number
    ) {
        const url = createSiteUrl("/mock-payment");

        url.searchParams.set("provider", provider);
        url.searchParams.set("purpose", "membership");
        url.searchParams.set("membership_subscription_id", subscriptionId);
        url.searchParams.set("tier", tier);
        url.searchParams.set("payment_ref", paymentRef);
        url.searchParams.set("amount", amount.toString());

        return url.toString();
    }
}

function addMonths(date: Date, months: number) {
    const nextDate = new Date(date);

    nextDate.setMonth(nextDate.getMonth() + months);

    return nextDate;
}

function isRejectableStatus(status: MembershipSubscriptionStatus) {
    return status === "pending_payment" || status === "payment_received";
}
