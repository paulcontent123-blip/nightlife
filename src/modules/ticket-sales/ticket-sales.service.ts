import { randomBytes } from "crypto";
import { createSiteUrl } from "@/config/site";
import {
    redisDelete,
    redisJsonGet,
    redisJsonSet,
    redisSetAdd,
    redisSetMembers,
    redisSetRemove,
} from "@/lib/redis/server";
import { AuthException } from "@/modules/auth/auth.errors";
import type { UserProfile } from "@/modules/auth/auth.types";
import { BANK_TRANSFER_TICKET_HOLD_MINUTES } from "@/modules/bank-transfer/bank-transfer.constants";
import {
    createBankTransferPaymentUrlPath,
    createBankTransferRef,
} from "@/modules/bank-transfer/bank-transfer.reference";
import { PaymentAccountRepository } from "@/modules/bank-transfer/payment-account.repository";
import { NotificationJobService } from "@/modules/notifications/jobs/notification-job.service";
import { TicketNotificationService } from "@/modules/notifications/ticket-notification.service";
import { PassportService } from "@/modules/passport/passport.service";
import type { PaymentIpnDTO, PaymentMethod, PaymentProvider } from "@/modules/payments/payment.types";
import { TicketSalesRepository } from "./ticket-sales.repository";
import type { PurchaseTicketDTO, TicketTierSaleRow } from "./ticket-sales.types";
import {
    AdminTicketOrderListQuerySchema,
    PurchaseTicketSchema,
    TicketListQuerySchema,
} from "./ticket-sales.validator";

const TICKET_LOCK_MINUTES = 5;
const TICKET_HOLD_SET_TTL_SECONDS = 60 * 60;
const PAYMENT_RECEIVED_TTL_SECONDS = 7 * 24 * 60 * 60;
const PLATFORM_FEE_RATE = 0.05;

type TicketHold = {
    payment_ref: string;
    provider: PaymentMethod;
    user_id: string;
    event_id: string;
    event_slug: string;
    event_title: string;
    tier_id: string;
    tier_name: string;
    tier_price: number;
    quantity: number;
    amount: number;
    platform_fee: number;
    created_at: string;
    expires_at: string;
};

type TicketPaymentMarker = {
    provider: PaymentProvider;
    payment_ref: string;
    amount: number;
    received_at: string;
};

const localTicketHolds = new Map<string, TicketHold>();
const localPaymentMarkers = new Map<string, TicketPaymentMarker>();

export class TicketSalesService {
    constructor(
        private repository = new TicketSalesRepository(),
        private notificationService = new TicketNotificationService(),
        private passportService = new PassportService(),
        private notificationJobService = new NotificationJobService(),
        private paymentAccountRepository = new PaymentAccountRepository()
    ) { }

    async purchaseTickets(eventSlug: string, input: PurchaseTicketDTO, user: UserProfile) {
        const dto = PurchaseTicketSchema.parse(input);
        const event = await this.repository.findPublicEventBySlug(eventSlug);

        if (!event) {
            throw new AuthException(404, "EVENT_NOT_FOUND");
        }

        const tier = await this.repository.findTierForEvent(event.id, dto.tier_id);

        if (!tier) {
            throw new AuthException(404, "TICKET_TIER_NOT_FOUND");
        }

        this.ensureTierSaleWindow(tier);

        const isBankTransfer = dto.payment_method === "bank_transfer";

        if (isBankTransfer && !(await this.paymentAccountRepository.findActive())) {
            throw new AuthException(503, "BANK_TRANSFER_NOT_CONFIGURED");
        }

        const [pendingTickets, heldTickets] = await Promise.all([
            this.repository.countPendingLockedTickets(tier.id),
            this.countHeldTickets(tier.id),
        ]);
        const lockedTickets = pendingTickets + heldTickets;
        const available = tier.quantity - tier.sold - lockedTickets;

        if (available < dto.quantity) {
            throw new AuthException(409, "TICKET_INSUFFICIENT_INVENTORY");
        }

        const totalAmount = tier.price * dto.quantity;
        const lockMinutes = isBankTransfer ? BANK_TRANSFER_TICKET_HOLD_MINUTES : TICKET_LOCK_MINUTES;
        const paymentRef = dto.payment_method === "bank_transfer"
            ? createBankTransferRef("ticket_order")
            : this.createPaymentRef(dto.payment_method, eventSlug);
        const paymentUrl = dto.payment_method === "bank_transfer"
            ? createSiteUrl(createBankTransferPaymentUrlPath("ticket_order", paymentRef)).toString()
            : this.createMockPaymentUrl(dto.payment_method, paymentRef, totalAmount);
        const createdAt = new Date().toISOString();
        const hold: TicketHold = {
            payment_ref: paymentRef,
            provider: dto.payment_method,
            user_id: user.id,
            event_id: event.id,
            event_slug: event.slug,
            event_title: event.title,
            tier_id: tier.id,
            tier_name: tier.name,
            tier_price: tier.price,
            quantity: dto.quantity,
            amount: totalAmount,
            platform_fee: Math.ceil(totalAmount * PLATFORM_FEE_RATE),
            created_at: createdAt,
            expires_at: this.createLockExpiresAt(createdAt, lockMinutes),
        };

        await this.writeTicketHold(hold);

        return {
            hold: {
                id: paymentRef,
                status: "held",
                payment_ref: paymentRef,
                created_at: hold.created_at,
                expires_at: hold.expires_at,
            },
            event: {
                id: event.id,
                slug: event.slug,
                title: event.title,
            },
            tier: {
                id: tier.id,
                name: tier.name,
                price: tier.price,
            },
            quantity: dto.quantity,
            inventory: {
                total: tier.quantity,
                sold: tier.sold,
                locked: lockedTickets + dto.quantity,
                available_after_lock: available - dto.quantity,
            },
            lock: {
                minutes: lockMinutes,
                expires_at: hold.expires_at,
                storage: "redis: ticket:hold:{payment_ref}",
            },
            payment: {
                required: totalAmount > 0,
                provider: dto.payment_method,
                amount: totalAmount,
                payment_ref: paymentRef,
                payment_url: paymentUrl,
            },
            next_step: "redirect_payment",
            note: "No ticket_orders or tickets are created until payment success. The temporary seat hold lives in Redis.",
        };
    }

    async handlePaymentReceived(provider: PaymentProvider, input: PaymentIpnDTO) {
        const existingOrder = await this.repository.findOrderByPaymentRef(input.payment_ref);

        if (existingOrder) {
            // Bank transfers are only ever confirmed by an admin, never by an IPN.
            if (existingOrder.payment_method === "bank_transfer") {
                throw new AuthException(409, "PAYMENT_METHOD_MISMATCH");
            }

            if (input.ticket_order_id && input.ticket_order_id !== existingOrder.id) {
                throw new AuthException(404, "PAYMENT_NOT_FOUND");
            }

            if (existingOrder.total_amount !== input.amount) {
                throw new AuthException(400, "PAYMENT_AMOUNT_MISMATCH");
            }

            return {
                provider,
                order: existingOrder,
                idempotent: true,
                status: existingOrder.status === "paid" ? "paid" : "payment_received",
                persisted_order_status: existingOrder.status,
                message: existingOrder.status === "paid"
                    ? "Ticket order was already paid and issued."
                    : "Ticket order payment was already received and is waiting for admin confirmation.",
            };
        }

        const hold = await this.readTicketHold(input.payment_ref);

        if (!hold) {
            throw new AuthException(404, "PAYMENT_NOT_FOUND");
        }

        if (hold.provider === "bank_transfer") {
            throw new AuthException(409, "PAYMENT_METHOD_MISMATCH");
        }

        if (hold.amount !== input.amount) {
            throw new AuthException(400, "PAYMENT_AMOUNT_MISMATCH");
        }

        if (this.isHoldExpired(hold)) {
            await this.deleteTicketHold(hold);
            throw new AuthException(409, "TICKET_ORDER_LOCK_EXPIRED");
        }

        if (input.status !== "success") {
            return {
                provider,
                hold: {
                    id: hold.payment_ref,
                    expires_at: hold.expires_at,
                },
                status: "ignored",
                message: "Mock payment failed. No ticket order was created.",
            };
        }

        const order = await this.repository.createTicketOrder({
            userId: hold.user_id,
            eventId: hold.event_id,
            totalAmount: hold.amount,
            platformFee: hold.platform_fee,
            paymentMethod: provider,
            paymentRef: hold.payment_ref,
        });

        await this.repository.createPendingOrderTickets({
            orderId: order.id,
            eventId: hold.event_id,
            tierId: hold.tier_id,
            userId: hold.user_id,
            quantity: hold.quantity,
            codes: Array.from({ length: hold.quantity }, () => this.createPendingTicketCode()),
        });

        await this.writePaymentReceivedMarker(order.id, {
            provider,
            payment_ref: input.payment_ref,
            amount: input.amount,
            received_at: new Date().toISOString(),
        });
        await this.deleteTicketHold(hold);

        return {
            provider,
            order,
            quantity: hold.quantity,
            status: "payment_received",
            persisted_order_status: order.status,
            message: "Payment received. Ticket order and pending tickets were created and are waiting for admin confirmation.",
        };
    }

    async listAdminOrders(searchParams: URLSearchParams) {
        const query = AdminTicketOrderListQuerySchema.parse(Object.fromEntries(searchParams));

        return this.repository.listAdminOrders(query);
    }

    async confirmTicketOrder(orderId: string) {
        const order = await this.getExistingOrder(orderId);

        if (order.status === "paid") {
            const tickets = await this.repository.listTicketsByOrder(order.id, true);

            return {
                order,
                tickets,
                issued_count: tickets.length,
                idempotent: true,
                email_status: "skipped",
            };
        }

        if (order.status !== "pending") {
            throw new AuthException(409, "TICKET_ORDER_CANNOT_BE_CONFIRMED");
        }

        // For bank transfers the admin's own reconciliation is the proof of
        // payment; gateway payments must have a received-payment marker.
        const paymentMarker = order.payment_method === "bank_transfer"
            ? true
            : await this.readPaymentReceivedMarker(order.id);

        if (!paymentMarker) {
            throw new AuthException(
                409,
                "TICKET_ORDER_CANNOT_BE_CONFIRMED",
                "Ticket order payment must be received before admin confirmation"
            );
        }

        const pendingTickets = await this.repository.listTicketsByOrder(order.id);
        const firstTicket = pendingTickets[0];

        if (!firstTicket) {
            throw new AuthException(404, "TICKET_NOT_FOUND");
        }

        await this.repository.increaseTierSold(firstTicket.tier_id, pendingTickets.length);
        const tickets = await this.repository.issuePendingOrderTickets(pendingTickets);
        const updatedOrder = await this.repository.updateOrderStatus(order.id, "paid");
        await this.deletePaymentReceivedMarker(order.id);
        await this.passportService.awardTicketOrderPoints({
            userId: updatedOrder.user_id,
            orderId: updatedOrder.id,
        });

        await this.notificationService.sendTicketsIssued({
            order: {
                ...updatedOrder,
                tier_id: firstTicket.tier_id,
                quantity: tickets.length,
            },
            tickets,
        });
        await this.scheduleEventReminderJob(updatedOrder);

        return {
            order: updatedOrder,
            tickets,
            issued_count: tickets.length,
            email_status: "requested",
        };
    }

    // Bank transfer: resolves a payment reference to the user's live hold or
    // to the order created when they reported the transfer.
    async getBankTransferPayment(paymentRef: string, user: UserProfile) {
        const order = await this.repository.findOrderByPaymentRef(paymentRef);

        if (order) {
            if (order.payment_method !== "bank_transfer" || !this.canAccess(order.user_id, user)) {
                throw new AuthException(404, "BANK_TRANSFER_NOT_FOUND");
            }

            return { order, hold: null };
        }

        const hold = await this.readTicketHold(paymentRef);

        if (hold) {
            if (hold.provider !== "bank_transfer" || !this.canAccess(hold.user_id, user)) {
                throw new AuthException(404, "BANK_TRANSFER_NOT_FOUND");
            }

            return { order: null, hold };
        }

        return { order: null, hold: null };
    }

    // User reports the transfer: the Redis hold becomes a pending order in the
    // database, so the seats stay reserved until an admin reconciles it.
    async claimBankTransfer(paymentRef: string, user: UserProfile) {
        const existing = await this.getBankTransferPayment(paymentRef, user);

        if (existing.order) {
            return existing.order;
        }

        const hold = existing.hold;

        if (!hold) {
            throw new AuthException(409, "BANK_TRANSFER_HOLD_EXPIRED");
        }

        let order;

        try {
            order = await this.repository.createTicketOrder({
                userId: hold.user_id,
                eventId: hold.event_id,
                totalAmount: hold.amount,
                platformFee: hold.platform_fee,
                paymentMethod: "bank_transfer",
                paymentRef: hold.payment_ref,
                paymentClaimedAt: new Date().toISOString(),
            });
        } catch (error) {
            // A concurrent click already created the order.
            if (error instanceof AuthException && error.code === "PAYMENT_ALREADY_PROCESSED") {
                const concurrentOrder = await this.repository.findOrderByPaymentRef(paymentRef);

                if (concurrentOrder) {
                    return concurrentOrder;
                }
            }

            throw error;
        }

        await this.repository.createPendingOrderTickets({
            orderId: order.id,
            eventId: hold.event_id,
            tierId: hold.tier_id,
            userId: hold.user_id,
            quantity: hold.quantity,
            codes: Array.from({ length: hold.quantity }, () => this.createPendingTicketCode()),
        });
        await this.deleteTicketHold(hold);

        return order;
    }

    // Admin could not find the transfer: cancel the order and release seats.
    async rejectBankTransferOrder(orderId: string) {
        const order = await this.getExistingOrder(orderId);

        if (order.payment_method !== "bank_transfer" || order.status !== "pending") {
            throw new AuthException(409, "BANK_TRANSFER_INVALID_STATUS");
        }

        await this.repository.cancelOrderTickets(order.id);

        return this.repository.updateOrderStatus(order.id, "cancelled");
    }

    private canAccess(ownerId: string, user: UserProfile) {
        return ownerId === user.id || user.role === "admin";
    }

    async listMineTickets(user: UserProfile, searchParams: URLSearchParams) {
        const query = TicketListQuerySchema.parse(Object.fromEntries(searchParams));

        return this.repository.listMineTickets(user.id, query);
    }

    async getTicketByCode(code: string, user: UserProfile) {
        const ticket = await this.getExistingTicket(code);

        if (ticket.user_id !== user.id && user.role !== "admin") {
            throw new AuthException(403, "FORBIDDEN");
        }

        return ticket;
    }

    async checkInTicket(code: string) {
        const existingTicket = await this.getExistingTicket(code);

        if (existingTicket.status !== "valid") {
            throw new AuthException(409, "TICKET_ALREADY_USED");
        }

        const ticket = await this.repository.checkInTicket(code);

        if (!ticket) {
            throw new AuthException(409, "TICKET_ALREADY_USED");
        }

        return {
            ticket,
            realtime: {
                event: "ticket_checked_in",
                event_id: ticket.event_id,
                checked_in_at: ticket.checked_in_at,
                note: "Frontend can subscribe to Supabase Realtime on public.tickets if realtime is enabled externally.",
            },
        };
    }

    private async getExistingOrder(orderId: string) {
        const order = await this.repository.findOrderById(orderId);

        if (!order) {
            throw new AuthException(404, "TICKET_ORDER_NOT_FOUND");
        }

        return order;
    }

    private async getExistingTicket(code: string) {
        const ticket = await this.repository.findIssuedTicketByCode(code);

        if (!ticket) {
            throw new AuthException(404, "TICKET_NOT_FOUND");
        }

        return ticket;
    }

    private ensureTierSaleWindow(tier: TicketTierSaleRow) {
        const now = Date.now();

        if (tier.sale_starts_at && now < Date.parse(tier.sale_starts_at)) {
            throw new AuthException(409, "TICKET_SALE_NOT_OPEN");
        }

        if (tier.sale_ends_at && now > Date.parse(tier.sale_ends_at)) {
            throw new AuthException(409, "TICKET_SALE_CLOSED");
        }
    }

    private createLockExpiresAt(createdAt: string, lockMinutes: number) {
        return new Date(Date.parse(createdAt) + lockMinutes * 60 * 1000).toISOString();
    }

    private isHoldExpired(hold: TicketHold) {
        return Date.now() > Date.parse(hold.expires_at);
    }

    private createPaymentRef(provider: PaymentProvider, eventSlug: string) {
        const eventKey = eventSlug.replace(/[^a-z0-9]/gi, "").slice(0, 8).toUpperCase() || "EVENT";

        return `MOCK_${provider.toUpperCase()}_TICKET_${eventKey}_${randomBytes(4).toString("hex").toUpperCase()}`;
    }

    private createPendingTicketCode() {
        return `LOCK_${randomBytes(12).toString("hex").toUpperCase()}`;
    }

    private createMockPaymentUrl(provider: PaymentProvider, paymentRef: string, amount: number) {
        const url = createSiteUrl("/mock-payment");

        url.searchParams.set("purpose", "ticket_order");
        url.searchParams.set("provider", provider);
        url.searchParams.set("payment_ref", paymentRef);
        url.searchParams.set("amount", amount.toString());

        return url.toString();
    }

    private async countHeldTickets(tierId: string) {
        const redisPaymentRefs = await redisSetMembers(this.createTierHoldsKey(tierId));

        if (redisPaymentRefs.length > 0) {
            const holds = await Promise.all(redisPaymentRefs.map((paymentRef) => this.readTicketHold(paymentRef)));
            const stalePaymentRefs = redisPaymentRefs.filter((paymentRef, index) => !holds[index]);
            const activeHolds = holds.filter((hold): hold is TicketHold => hold !== null && !this.isHoldExpired(hold));

            if (stalePaymentRefs.length > 0) {
                await redisSetRemove(this.createTierHoldsKey(tierId), stalePaymentRefs);
            }

            return activeHolds.reduce((total, hold) => total + hold.quantity, 0);
        }

        return [...localTicketHolds.values()]
            .filter((hold) => hold.tier_id === tierId && !this.isHoldExpired(hold))
            .reduce((total, hold) => total + hold.quantity, 0);
    }

    private async writeTicketHold(hold: TicketHold) {
        const ttlSeconds = Math.max(1, Math.ceil((Date.parse(hold.expires_at) - Date.now()) / 1000));

        localTicketHolds.set(hold.payment_ref, hold);
        await Promise.all([
            redisJsonSet(this.createTicketHoldKey(hold.payment_ref), hold, ttlSeconds),
            redisSetAdd(this.createTierHoldsKey(hold.tier_id), hold.payment_ref, TICKET_HOLD_SET_TTL_SECONDS),
        ]);
    }

    private async readTicketHold(paymentRef: string) {
        const hold = await redisJsonGet<TicketHold>(this.createTicketHoldKey(paymentRef))
            ?? localTicketHolds.get(paymentRef)
            ?? null;

        if (hold && this.isHoldExpired(hold)) {
            await this.deleteTicketHold(hold);
            return null;
        }

        return hold;
    }

    private async deleteTicketHold(hold: TicketHold) {
        localTicketHolds.delete(hold.payment_ref);
        await Promise.all([
            redisDelete([this.createTicketHoldKey(hold.payment_ref)]),
            redisSetRemove(this.createTierHoldsKey(hold.tier_id), [hold.payment_ref]),
        ]);
    }

    private createTicketHoldKey(paymentRef: string) {
        return `ticket:hold:${paymentRef}`;
    }

    private async scheduleEventReminderJob(order: {
        id: string;
        event_id: string;
        user_id: string;
    }) {
        try {
            return await this.notificationJobService.scheduleEventStartsTomorrow({
                eventId: order.event_id,
                userId: order.user_id,
                orderId: order.id,
            });
        } catch {
            return null;
        }
    }

    private createTierHoldsKey(tierId: string) {
        return `ticket:holds:tier:${tierId}`;
    }

    private async writePaymentReceivedMarker(orderId: string, marker: TicketPaymentMarker) {
        localPaymentMarkers.set(orderId, marker);
        await redisJsonSet(this.createPaymentReceivedKey(orderId), marker, PAYMENT_RECEIVED_TTL_SECONDS);
    }

    private async readPaymentReceivedMarker(orderId: string) {
        return await redisJsonGet<TicketPaymentMarker>(this.createPaymentReceivedKey(orderId))
            ?? localPaymentMarkers.get(orderId)
            ?? null;
    }

    private async deletePaymentReceivedMarker(orderId: string) {
        localPaymentMarkers.delete(orderId);
        await redisDelete([this.createPaymentReceivedKey(orderId)]);
    }

    private createPaymentReceivedKey(orderId: string) {
        return `ticket:payment_received:${orderId}`;
    }
}
