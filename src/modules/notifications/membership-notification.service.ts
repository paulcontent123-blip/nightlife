import { AuthRepository } from "@/modules/auth/auth.repository";
import type { MembershipSubscriptionRow } from "@/modules/membership/membership.types";
import { NotificationService } from "./notification.service";
import {
    renderMembershipActivatedEmail,
    renderMembershipPaymentReceivedEmail,
} from "./templates/membership-email.templates";

export class MembershipNotificationService {
    constructor(
        private authRepository = new AuthRepository(),
        private notificationService = new NotificationService()
    ) { }

    async sendPaymentReceived(subscription: MembershipSubscriptionRow) {
        await this.sendMembershipEmail(subscription, "payment_received");
    }

    async sendActivated(subscription: MembershipSubscriptionRow) {
        await this.sendMembershipEmail(subscription, "activated");
    }

    private async sendMembershipEmail(
        subscription: MembershipSubscriptionRow,
        type: "payment_received" | "activated"
    ) {
        if (!this.notificationService.isEmailConfigured()) {
            console.warn("Skipping membership email because RESEND_API_KEY is not configured", {
                subscription_id: subscription.id,
                type,
            });
            return;
        }

        const user = await this.authRepository.findById(subscription.user_id);

        if (!user) {
            console.warn("Skipping membership email because user was not found", {
                subscription_id: subscription.id,
                user_id: subscription.user_id,
                type,
            });
            return;
        }

        const email = type === "payment_received"
            ? renderMembershipPaymentReceivedEmail({ user, subscription })
            : renderMembershipActivatedEmail({ user, subscription });

        try {
            await this.notificationService.sendEmail({
                to: user.email,
                subject: email.subject,
                html: email.html,
                text: email.text,
            });
        } catch (error) {
            console.error("Membership email failed", {
                subscription_id: subscription.id,
                type,
                error,
            });
        }
    }
}
