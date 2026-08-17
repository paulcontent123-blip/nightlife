import { randomBytes } from "crypto";
import {
    hasMomoCredentials,
    hasVnpayCredentials,
    paymentConfig,
} from "@/config/payments";
import { createSiteUrl } from "@/config/site";
import { logBookingLifecycle } from "@/lib/logger/booking-lifecycle";
import { AuthException } from "@/modules/auth/auth.errors";
import type { UserProfile } from "@/modules/auth/auth.types";
import { BookingRepository } from "@/modules/bookings/booking.repository";
import { MembershipService } from "@/modules/membership/membership.service";
import { TicketSalesService } from "@/modules/ticket-sales/ticket-sales.service";
import {
    incrementVenueAvailabilityCacheVersion,
    incrementVenueListCacheVersion,
} from "@/modules/venues/venue-cache";
import { CreatePaymentSchema, PaymentIpnSchema } from "./payment.validator";
import type { CreatePaymentDTO, PaymentIpnDTO, PaymentProvider } from "./payment.types";

export class PaymentService {
    constructor(
        private bookingRepository = new BookingRepository(),
        private ticketSalesService = new TicketSalesService(),
        private membershipService = new MembershipService()
    ) { }

    // Creates a mock payment URL for a pending booking deposit.
    async createPayment(provider: PaymentProvider, input: CreatePaymentDTO, user: UserProfile) {
        const dto = CreatePaymentSchema.parse(input);
        logBookingLifecycle("payment_create_requested", {
            provider,
            booking_id: dto.booking_id,
            user_id: user.id,
        });

        const booking = await this.bookingRepository.findById(dto.booking_id);

        if (!booking) {
            throw new AuthException(404, "BOOKING_NOT_FOUND");
        }

        if (booking.user_id !== user.id && user.role !== "admin") {
            throw new AuthException(403, "FORBIDDEN");
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

        const paymentRef = booking.payment_ref ?? this.createPaymentRef(provider, booking.id);

        if (!booking.payment_ref) {
            await this.bookingRepository.update(booking.id, {
                payment_ref: paymentRef,
            });
        }

        const mode = this.resolveProviderMode(provider);
        logBookingLifecycle("payment_redirect_created", {
            provider,
            mode,
            booking_id: booking.id,
            user_id: booking.user_id,
            venue_id: booking.venue_id,
            amount: booking.deposit.amount,
            payment_ref: paymentRef,
        });

        return {
            provider,
            mode,
            booking_id: booking.id,
            amount: booking.deposit.amount,
            payment_ref: paymentRef,
            payment_url: this.createMockPaymentUrl(provider, booking.id, paymentRef, booking.deposit.amount),
            note: mode === "mock"
                ? "Mock payment URL generated because sandbox credentials are not active or PAYMENT_MODE=mock."
                : "Sandbox credentials detected, but this phase currently uses the mock provider.",
        };
    }

    // Mock IPN endpoint: verifies amount/ref and marks the deposit as received.
    async handleMockIpn(provider: PaymentProvider, input: PaymentIpnDTO) {
        const dto = PaymentIpnSchema.parse(input);
        logBookingLifecycle("payment_ipn_received", {
            provider,
            booking_id: dto.booking_id,
            ticket_order_id: dto.ticket_order_id,
            purpose: dto.purpose,
            payment_ref: dto.payment_ref,
            payment_status: dto.status,
            amount: dto.amount,
            transaction_id: dto.transaction_id,
        });

        if (dto.purpose === "membership") {
            return this.membershipService.handlePaymentReceived(provider, dto);
        }

        const booking = await this.bookingRepository.findByPaymentRef(dto.payment_ref);

        if (!booking) {
            return this.ticketSalesService.handlePaymentReceived(provider, dto);
        }

        if (dto.booking_id && booking.id !== dto.booking_id) {
            throw new AuthException(404, "PAYMENT_NOT_FOUND");
        }

        if (booking.deposit.amount !== dto.amount) {
            throw new AuthException(400, "PAYMENT_AMOUNT_MISMATCH");
        }

        if (booking.deposit.paid) {
            logBookingLifecycle("payment_ipn_idempotent", {
                provider,
                booking_id: booking.id,
                venue_id: booking.venue_id,
                user_id: booking.user_id,
                payment_ref: dto.payment_ref,
                status: booking.status,
                deposit_paid: booking.deposit.paid,
            });

            return {
                provider,
                booking,
                idempotent: true,
                message: "Payment was already received for this booking.",
            };
        }

        if (booking.status !== "pending") {
            throw new AuthException(409, "PAYMENT_INVALID_STATUS");
        }

        if (dto.status !== "success") {
            logBookingLifecycle("payment_ipn_failed_ignored", {
                provider,
                booking_id: booking.id,
                venue_id: booking.venue_id,
                user_id: booking.user_id,
                payment_ref: dto.payment_ref,
                payment_status: dto.status,
            });

            return {
                provider,
                booking,
                status: "ignored",
                message: "Mock payment failed. Booking remains pending.",
            };
        }

        const paymentReceivedBooking = await this.bookingRepository.update(booking.id, {
            status: "pending",
            deposit_paid: true,
            payment_ref: dto.payment_ref,
        });

        await this.afterPaymentMutation(booking.venue_id);
        logBookingLifecycle("payment_received_pending_admin_confirm", {
            booking_id: paymentReceivedBooking.id,
            venue_id: paymentReceivedBooking.venue_id,
            user_id: paymentReceivedBooking.user_id,
            status: paymentReceivedBooking.status,
            deposit_paid: paymentReceivedBooking.deposit.paid,
            payment_ref: paymentReceivedBooking.payment_ref,
            provider,
        });

        return {
            provider,
            booking: paymentReceivedBooking,
            idempotent: false,
            status: "received_pending_admin_confirm",
            message: "Payment received. Booking is waiting for admin confirmation.",
        };
    }

    private resolveProviderMode(provider: PaymentProvider) {
        if (paymentConfig.mode === "mock") {
            return "mock";
        }

        const hasCredentials = provider === "vnpay"
            ? hasVnpayCredentials()
            : hasMomoCredentials();

        return hasCredentials ? paymentConfig.mode : "mock";
    }

    private createPaymentRef(provider: PaymentProvider, bookingId: string) {
        return `MOCK_${provider.toUpperCase()}_${bookingId.slice(0, 8)}_${randomBytes(4).toString("hex").toUpperCase()}`;
    }

    private createMockPaymentUrl(
        provider: PaymentProvider,
        bookingId: string,
        paymentRef: string,
        amount: number
    ) {
        const url = createSiteUrl("/mock-payment");

        url.searchParams.set("provider", provider);
        url.searchParams.set("booking_id", bookingId);
        url.searchParams.set("payment_ref", paymentRef);
        url.searchParams.set("amount", amount.toString());

        return url.toString();
    }

    private async afterPaymentMutation(venueId: string) {
        await Promise.all([
            incrementVenueAvailabilityCacheVersion(venueId),
            incrementVenueListCacheVersion(),
            this.bookingRepository.refreshVenueBookingSummary(venueId),
        ]);
    }
}
