import { createSiteUrl } from "@/config/site";
import { getResendOperationsEmail, isResendConfigured } from "@/config/resend";
import { sendEmail } from "@/lib/resend/server";
import { formatVnd } from "@/lib/format";
import { AuthException } from "@/modules/auth/auth.errors";
import type { UserProfile } from "@/modules/auth/auth.types";
import { BookingRepository } from "@/modules/bookings/booking.repository";
import { BookingService } from "@/modules/bookings/booking.service";
import { MembershipService } from "@/modules/membership/membership.service";
import type { BankTransferPurpose } from "@/modules/payments/payment.types";
import { TicketSalesService } from "@/modules/ticket-sales/ticket-sales.service";
import { BANK_TRANSFER_PURPOSE_LABEL, findVietQrBank } from "./bank-transfer.constants";
import { createBankTransferPaymentUrlPath, createBankTransferRef } from "./bank-transfer.reference";
import { BankTransferRepository } from "./bank-transfer.repository";
import {
    AdminBankTransferActionSchema,
    BankTransferClaimSchema,
    BankTransferLookupSchema,
    CreateBookingBankTransferSchema,
    CreatePaymentAccountSchema,
    UpdatePaymentAccountSchema,
} from "./bank-transfer.validator";
import { PaymentAccountRepository, type PaymentAccount } from "./payment-account.repository";
import { createVietQrImageUrl, normalizeAccountName } from "./vietqr";

export type BankTransferStatus = "awaiting_transfer" | "claimed" | "paid" | "cancelled" | "expired";

interface PaymentState {
    purpose: BankTransferPurpose;
    payment_ref: string;
    amount: number;
    status: BankTransferStatus;
    claimed_at: string | null;
    expires_at: string | null;
    title: string;
    return_url: string;
}

const MEMBERSHIP_TIER_TITLE: Record<string, string> = {
    night_pass: "Night Pass",
    black_card: "Black Card",
};

// Manual bank transfer (VietQR): the user transfers to the admin's active
// account with the payment reference as transfer content, reports it, and an
// admin reconciles the bank statement before anything is confirmed. Nothing
// in this flow ever marks a payment as received on the user's word alone.
export class BankTransferService {
    constructor(
        private accounts = new PaymentAccountRepository(),
        private repository = new BankTransferRepository(),
        private bookingRepository = new BookingRepository(),
        private bookingService = new BookingService(),
        private ticketSalesService = new TicketSalesService(),
        private membershipService = new MembershipService()
    ) { }

    // ---------------------------------------------------------------
    // Customer
    // ---------------------------------------------------------------

    async createForBooking(input: unknown, user: UserProfile) {
        const dto = CreateBookingBankTransferSchema.parse(input);
        const booking = await this.bookingRepository.findById(dto.booking_id);

        if (!booking || (booking.user_id !== user.id && user.role !== "admin")) {
            throw new AuthException(404, "BOOKING_NOT_FOUND");
        }

        if (booking.status !== "pending") {
            throw new AuthException(409, "PAYMENT_INVALID_STATUS");
        }

        if (booking.deposit.amount <= 0) {
            throw new AuthException(422, "PAYMENT_NOT_REQUIRED");
        }

        if (booking.deposit.paid) {
            throw new AuthException(409, "PAYMENT_ALREADY_PAID");
        }

        await this.requireActiveAccount();

        let paymentRef = booking.payment_ref;

        if (booking.payment_method !== "bank_transfer" || !paymentRef?.startsWith("NLB")) {
            paymentRef = createBankTransferRef("booking");
            await this.bookingRepository.update(booking.id, {
                payment_method: "bank_transfer",
                payment_ref: paymentRef,
                payment_claimed_at: null,
            });
        }

        return {
            booking_id: booking.id,
            amount: booking.deposit.amount,
            payment_ref: paymentRef,
            payment_url: createSiteUrl(createBankTransferPaymentUrlPath("booking", paymentRef)).toString(),
        };
    }

    async getInstructions(input: unknown, user: UserProfile) {
        const dto = BankTransferLookupSchema.parse(input);
        const state = await this.readPaymentState(dto.purpose, dto.ref, user);

        return this.withAccount(state);
    }

    async claim(input: unknown, user: UserProfile) {
        const dto = BankTransferClaimSchema.parse(input);
        const before = await this.readPaymentState(dto.purpose, dto.payment_ref, user);

        if (before.status === "paid" || before.status === "claimed") {
            return this.withAccount(before);
        }

        if (before.status !== "awaiting_transfer") {
            throw new AuthException(409, "BANK_TRANSFER_INVALID_STATUS");
        }

        if (dto.purpose === "booking") {
            const booking = await this.findOwnBookingByRef(dto.payment_ref, user);

            await this.bookingRepository.update(booking.id, {
                payment_claimed_at: new Date().toISOString(),
            });
        } else if (dto.purpose === "ticket_order") {
            await this.ticketSalesService.claimBankTransfer(dto.payment_ref, user);
        } else {
            await this.membershipService.claimBankTransfer(dto.payment_ref, user);
        }

        const after = await this.readPaymentState(dto.purpose, dto.payment_ref, user);

        await this.notifyAdminOfClaim(after, user);

        return this.withAccount(after);
    }

    // ---------------------------------------------------------------
    // Admin: reconciliation queue
    // ---------------------------------------------------------------

    async listQueue() {
        const [bookings, ticketOrders, memberships] = await Promise.all([
            this.repository.listPendingBookings(),
            this.repository.listPendingTicketOrders(),
            this.repository.listPendingMemberships(),
        ]);
        const [users, venues, events] = await Promise.all([
            this.repository.findUsers([
                ...bookings.map((row) => row.user_id),
                ...ticketOrders.map((row) => row.user_id),
                ...memberships.map((row) => row.user_id),
            ]),
            this.repository.findVenueNames(bookings.map((row) => row.venue_id)),
            this.repository.findEventTitles(ticketOrders.map((row) => row.event_id)),
        ]);

        const toUser = (userId: string) => {
            const user = users.get(userId);

            return {
                id: userId,
                email: user?.email ?? null,
                display_name: user?.display_name ?? null,
            };
        };

        const items = [
            ...bookings.map((row) => ({
                purpose: "booking" as const,
                id: row.id,
                payment_ref: row.payment_ref,
                amount: row.deposit_amount,
                claimed_at: row.payment_claimed_at,
                created_at: row.created_at,
                description: `${venues.get(row.venue_id)?.name ?? "Venue"} · ${row.booking_date} ${row.booking_time.slice(0, 5)}`,
                user: toUser(row.user_id),
            })),
            ...ticketOrders.map((row) => ({
                purpose: "ticket_order" as const,
                id: row.id,
                payment_ref: row.payment_ref,
                amount: row.total_amount,
                claimed_at: row.payment_claimed_at,
                created_at: row.created_at,
                description: events.get(row.event_id)?.title ?? "Sự kiện",
                user: toUser(row.user_id),
            })),
            ...memberships.map((row) => ({
                purpose: "membership" as const,
                id: row.id,
                payment_ref: row.payment_ref,
                amount: row.amount,
                claimed_at: row.payment_claimed_at,
                created_at: row.created_at,
                description: `Gói ${MEMBERSHIP_TIER_TITLE[row.tier] ?? row.tier}`,
                user: toUser(row.user_id),
            })),
        ];

        // Reported transfers first (newest report first), then the rest.
        items.sort((a, b) => {
            if (Boolean(a.claimed_at) !== Boolean(b.claimed_at)) {
                return a.claimed_at ? -1 : 1;
            }

            const aTime = Date.parse(a.claimed_at ?? a.created_at);
            const bTime = Date.parse(b.claimed_at ?? b.created_at);

            return bTime - aTime;
        });

        return {
            items,
            claimed_count: items.filter((item) => item.claimed_at).length,
        };
    }

    // Admin found the transfer on the bank statement.
    async verify(input: unknown) {
        const dto = AdminBankTransferActionSchema.parse(input);

        if (dto.purpose === "booking") {
            const booking = await this.findPendingBankTransferBooking(dto.id);

            await this.bookingRepository.update(booking.id, {
                deposit_paid: true,
                payment_claimed_at: booking.payment_claimed_at ?? new Date().toISOString(),
            });

            return { purpose: dto.purpose, result: await this.bookingService.confirmBooking(booking.id) };
        }

        if (dto.purpose === "ticket_order") {
            return { purpose: dto.purpose, result: await this.ticketSalesService.confirmTicketOrder(dto.id) };
        }

        await this.membershipService.markBankTransferReceived(dto.id);

        return { purpose: dto.purpose, result: await this.membershipService.confirmSubscription(dto.id) };
    }

    // Admin could not find the transfer. Bookings and memberships go back to
    // "waiting for transfer" so the user can retry; ticket orders are
    // cancelled so the held seats are released.
    async reject(input: unknown) {
        const dto = AdminBankTransferActionSchema.parse(input);

        if (dto.purpose === "booking") {
            const booking = await this.findPendingBankTransferBooking(dto.id);

            return {
                purpose: dto.purpose,
                result: await this.bookingRepository.update(booking.id, { payment_claimed_at: null }),
            };
        }

        if (dto.purpose === "ticket_order") {
            return { purpose: dto.purpose, result: await this.ticketSalesService.rejectBankTransferOrder(dto.id) };
        }

        return { purpose: dto.purpose, result: await this.membershipService.resetBankTransferClaim(dto.id) };
    }

    // ---------------------------------------------------------------
    // Admin: receiving accounts
    // ---------------------------------------------------------------

    async listAccounts() {
        return { items: await this.accounts.list() };
    }

    async createAccount(input: unknown) {
        const dto = CreatePaymentAccountSchema.parse(input);
        const bank = findVietQrBank(dto.bank_bin);

        if (!bank) {
            throw new AuthException(422, "PAYMENT_ACCOUNT_NOT_FOUND", "Unsupported bank");
        }

        return this.accounts.create({
            bank_bin: bank.bin,
            bank_code: bank.code,
            bank_name: bank.name,
            account_number: dto.account_number,
            account_name: normalizeAccountName(dto.account_name),
        });
    }

    async updateAccount(id: string, input: unknown) {
        const dto = UpdatePaymentAccountSchema.parse(input);

        return dto.is_active ? this.accounts.activate(id) : this.accounts.deactivate(id);
    }

    async deleteAccount(id: string) {
        const account = await this.accounts.findById(id);

        if (!account) {
            throw new AuthException(404, "PAYMENT_ACCOUNT_NOT_FOUND");
        }

        await this.accounts.delete(id);

        return { id, deleted: true };
    }

    // ---------------------------------------------------------------
    // Internals
    // ---------------------------------------------------------------

    private async readPaymentState(
        purpose: BankTransferPurpose,
        paymentRef: string,
        user: UserProfile
    ): Promise<PaymentState> {
        if (purpose === "booking") {
            const booking = await this.findOwnBookingByRef(paymentRef, user);
            const venues = await this.repository.findVenueNames([booking.venue_id]);
            const status: BankTransferStatus = booking.deposit.paid
                ? "paid"
                : booking.status !== "pending"
                    ? "cancelled"
                    : booking.payment_claimed_at
                        ? "claimed"
                        : "awaiting_transfer";

            return {
                purpose,
                payment_ref: paymentRef,
                amount: booking.deposit.amount,
                status,
                claimed_at: booking.payment_claimed_at,
                expires_at: null,
                title: `${BANK_TRANSFER_PURPOSE_LABEL.booking} · ${venues.get(booking.venue_id)?.name ?? "Venue"} · ${booking.booking_date} ${booking.booking_time}`,
                return_url: `/bookings/${booking.id}`,
            };
        }

        if (purpose === "ticket_order") {
            const { order, hold } = await this.ticketSalesService.getBankTransferPayment(paymentRef, user);

            if (order) {
                const events = await this.repository.findEventTitles([order.event_id]);

                return {
                    purpose,
                    payment_ref: paymentRef,
                    amount: order.total_amount,
                    status: order.status === "paid" ? "paid" : order.status === "pending" ? "claimed" : "cancelled",
                    claimed_at: order.payment_claimed_at,
                    expires_at: null,
                    title: `${BANK_TRANSFER_PURPOSE_LABEL.ticket_order} · ${events.get(order.event_id)?.title ?? "Sự kiện"}`,
                    return_url: "/tickets/mine",
                };
            }

            if (hold) {
                return {
                    purpose,
                    payment_ref: paymentRef,
                    amount: hold.amount,
                    status: "awaiting_transfer",
                    claimed_at: null,
                    expires_at: hold.expires_at,
                    title: `${BANK_TRANSFER_PURPOSE_LABEL.ticket_order} · ${hold.event_title} · ${hold.quantity} × ${hold.tier_name}`,
                    return_url: `/events/${hold.event_slug}`,
                };
            }

            return {
                purpose,
                payment_ref: paymentRef,
                amount: 0,
                status: "expired",
                claimed_at: null,
                expires_at: null,
                title: BANK_TRANSFER_PURPOSE_LABEL.ticket_order,
                return_url: "/events",
            };
        }

        const subscription = await this.membershipService.getBankTransferSubscription(paymentRef, user);
        const status: BankTransferStatus = subscription.status === "active"
            ? "paid"
            : subscription.status === "payment_received"
                ? "claimed"
                : subscription.status === "pending_payment"
                    ? "awaiting_transfer"
                    : "cancelled";

        return {
            purpose,
            payment_ref: paymentRef,
            amount: subscription.amount,
            status,
            claimed_at: subscription.payment_claimed_at,
            expires_at: null,
            title: `${BANK_TRANSFER_PURPOSE_LABEL.membership} · ${MEMBERSHIP_TIER_TITLE[subscription.tier] ?? subscription.tier}`,
            return_url: "/membership",
        };
    }

    // Account details and the QR are only shown while a transfer is expected.
    private async withAccount(state: PaymentState) {
        const showPaymentDetails = state.status === "awaiting_transfer" || state.status === "claimed";
        const account = showPaymentDetails ? await this.accounts.findActive() : null;

        return {
            ...state,
            account: account ? this.toPublicAccount(account) : null,
            qr_image_url: account
                ? createVietQrImageUrl({
                    bankBin: account.bank_bin,
                    accountNumber: account.account_number,
                    accountName: account.account_name,
                    amount: state.amount,
                    transferContent: state.payment_ref,
                })
                : null,
        };
    }

    private toPublicAccount(account: PaymentAccount) {
        return {
            bank_name: account.bank_name,
            bank_code: account.bank_code,
            account_number: account.account_number,
            account_name: account.account_name,
        };
    }

    private async requireActiveAccount() {
        const account = await this.accounts.findActive();

        if (!account) {
            throw new AuthException(503, "BANK_TRANSFER_NOT_CONFIGURED");
        }

        return account;
    }

    private async findOwnBookingByRef(paymentRef: string, user: UserProfile) {
        const booking = await this.bookingRepository.findByPaymentRef(paymentRef);

        if (
            !booking
            || booking.payment_method !== "bank_transfer"
            || (booking.user_id !== user.id && user.role !== "admin")
        ) {
            throw new AuthException(404, "BANK_TRANSFER_NOT_FOUND");
        }

        return booking;
    }

    private async findPendingBankTransferBooking(id: string) {
        const booking = await this.bookingRepository.findById(id);

        if (!booking || booking.payment_method !== "bank_transfer") {
            throw new AuthException(404, "BANK_TRANSFER_NOT_FOUND");
        }

        if (booking.status !== "pending" || booking.deposit.paid) {
            throw new AuthException(409, "BANK_TRANSFER_INVALID_STATUS");
        }

        return booking;
    }

    // Best effort: a failed email must not fail the user's report.
    private async notifyAdminOfClaim(state: PaymentState, user: UserProfile) {
        const to = getResendOperationsEmail();

        if (!isResendConfigured() || !to) {
            return;
        }

        try {
            const reconcileUrl = createSiteUrl("/admin/payments").toString();

            await sendEmail({
                to,
                subject: `[Đối soát] ${state.payment_ref} · ${formatVnd(state.amount)}`,
                html: [
                    `<p>Khách <strong>${escapeHtml(user.email ?? user.id)}</strong> báo đã chuyển khoản.</p>`,
                    `<p>${escapeHtml(state.title)}</p>`,
                    `<p>Số tiền: <strong>${escapeHtml(formatVnd(state.amount))}</strong><br/>`,
                    `Nội dung chuyển khoản: <strong>${escapeHtml(state.payment_ref)}</strong></p>`,
                    `<p>Đối chiếu sao kê rồi xác nhận tại <a href="${reconcileUrl}">${reconcileUrl}</a>.</p>`,
                ].join(""),
            });
        } catch (error) {
            console.error("Bank transfer claim email failed", {
                payment_ref: state.payment_ref,
                error,
            });
        }
    }
}

function escapeHtml(value: string) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}
