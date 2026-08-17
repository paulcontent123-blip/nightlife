import { AuthException } from "@/modules/auth/auth.errors";
import { logBookingLifecycle } from "@/lib/logger/booking-lifecycle";
import type { UserProfile } from "@/modules/auth/auth.types";
import { NotificationJobService } from "@/modules/notifications/jobs/notification-job.service";
import { BookingNotificationService } from "@/modules/notifications/booking-notification.service";
import { PassportService } from "@/modules/passport/passport.service";
import { getMembershipPerksForUser } from "@/modules/membership/membership-access";
import { assertWithinPriorityBookingWindow } from "@/modules/membership/priority-booking";
import {
    incrementVenueAvailabilityCacheVersion,
    incrementVenueListCacheVersion,
} from "@/modules/venues/venue-cache";
import { VenueRepository } from "@/modules/venues/venue.repository";
import { BookingRepository } from "./booking.repository";
import {
    AdminBookingListQuerySchema,
    BookingListQuerySchema,
    CreateBookingSchema,
} from "./booking.validator";
import type { CreateBookingDTO } from "./booking.types";

const DEFAULT_TIME_SLOTS = ["18:00", "19:00", "20:00", "21:00", "22:00", "23:00"];
const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
const CANCELLABLE_STATUSES = ["pending", "confirmed"] as const;
const CHECKIN_ALLOWED_STATUSES = ["confirmed"] as const;
const COMPLETE_ALLOWED_STATUSES = ["seated"] as const;
const MIN_CANCEL_HOURS = 2;
const BOOKING_REMINDER_HOURS_BEFORE = 3;
const BOOKING_REMINDER_WINDOW_MINUTES = 15;
const BOOKING_REMINDER_BATCH_LIMIT = 100;

export class BookingService {
    constructor(
        private repository = new BookingRepository(),
        private venueRepository = new VenueRepository(),
        private bookingNotificationService = new BookingNotificationService(),
        private notificationJobService = new NotificationJobService(),
        private passportService = new PassportService()
    ) { }

    // User creates a booking after venue/table/capacity/time availability checks.
    async createBooking(input: CreateBookingDTO, user: UserProfile) {
        const dto = CreateBookingSchema.parse(input);
        const perks = await getMembershipPerksForUser(user.id);

        assertWithinPriorityBookingWindow(dto.booking_date, perks.priority_booking_hours);
        logBookingLifecycle("booking_create_requested", {
            user_id: user.id,
            venue_id: dto.venue_id,
            table_id: dto.table_id,
            booking_date: dto.booking_date,
            booking_time: dto.booking_time,
            party_size: dto.party_size,
            payment_method: dto.payment_method ?? null,
            priority_booking_hours: perks.priority_booking_hours,
        });

        const venue = await this.venueRepository.findById(dto.venue_id);

        if (!venue || !venue.status.is_active) {
            throw new AuthException(404, "VENUE_NOT_FOUND");
        }

        const table = await this.repository.findTableForVenue(dto.venue_id, dto.table_id);

        if (!table || !table.is_active || table.capacity < dto.party_size) {
            throw new AuthException(422, "VENUE_TABLE_UNAVAILABLE");
        }

        if (!this.isBookingTimeAllowed(venue.operations.open_hours, dto.booking_date, dto.booking_time)) {
            throw new AuthException(422, "VENUE_TABLE_UNAVAILABLE", "Booking time is outside venue open hours");
        }

        if (await this.repository.hasBlockingBooking({
            venueId: dto.venue_id,
            tableId: dto.table_id,
            bookingDate: dto.booking_date,
            bookingTime: dto.booking_time,
        })) {
            throw new AuthException(409, "BOOKING_CONFLICT");
        }

        const booking = await this.repository.create({
            venue_id: dto.venue_id,
            table_id: dto.table_id,
            user_id: user.id,
            squad_id: null,
            booking_date: dto.booking_date,
            booking_time: dto.booking_time,
            party_size: dto.party_size,
            status: "pending",
            special_requests: dto.special_requests ?? null,
            deposit_amount: table.deposit_required,
            deposit_paid: dto.payment_method === "cash" ? table.deposit_required === 0 : false,
            payment_ref: null,
        });

        logBookingLifecycle("booking_pending_created", {
            booking_id: booking.id,
            user_id: user.id,
            venue_id: dto.venue_id,
            table_id: dto.table_id,
            booking_date: booking.booking_date,
            booking_time: booking.booking_time,
            party_size: booking.party_size,
            status: booking.status,
            deposit_amount: booking.deposit.amount,
            deposit_paid: booking.deposit.paid,
        });

        await this.afterBookingMutation(dto.venue_id);

        return {
            ...booking,
            payment_method: dto.payment_method ?? null,
        };
    }

    // User lists their own bookings with optional status filter and pagination.
    async listMine(user: UserProfile, searchParams: URLSearchParams) {
        const query = BookingListQuerySchema.parse(Object.fromEntries(searchParams));

        return this.repository.listMine(user.id, query);
    }

    // Admin lists all bookings with filters for venue, date, status, and pagination.
    async listAdmin(searchParams: URLSearchParams) {
        const query = AdminBookingListQuerySchema.parse(Object.fromEntries(searchParams));

        return this.repository.listAdmin(query);
    }

    // User can view their own booking; admin can view any booking.
    async getBooking(id: string, user: UserProfile) {
        const booking = await this.getExistingBooking(id);

        this.ensureCanAccessBooking(booking.user_id, user);

        return booking;
    }

    // Admin detail lookup without ownership restrictions.
    async getAdminBooking(id: string) {
        return this.getExistingBooking(id);
    }

    // User cancels their own booking only when the booking starts more than 2 hours later.
    async cancelBooking(id: string, user: UserProfile) {
        const booking = await this.getExistingBooking(id);

        this.ensureCanAccessBooking(booking.user_id, user);

        if (!CANCELLABLE_STATUSES.includes(booking.status as typeof CANCELLABLE_STATUSES[number])) {
            throw new AuthException(409, "BOOKING_CANNOT_BE_CANCELLED");
        }

        if (!this.canCancelBeforeBookingTime(booking.booking_date, booking.booking_time)) {
            throw new AuthException(409, "BOOKING_CANCEL_WINDOW_EXPIRED");
        }

        const updatedBooking = await this.repository.update(id, {
            status: "cancelled",
            cancelled_at: new Date().toISOString(),
        });

        await this.afterBookingMutation(booking.venue_id);
        await this.passportService.awardVenueCheckinPoints({
            userId: updatedBooking.user_id,
            venueId: updatedBooking.venue_id,
            bookingId: updatedBooking.id,
        });

        return updatedBooking;
    }

    // Admin confirms a pending booking after manual review or payment reconciliation.
    async confirmBooking(id: string) {
        const booking = await this.getExistingBooking(id);
        logBookingLifecycle("booking_manual_confirm_requested", {
            booking_id: booking.id,
            venue_id: booking.venue_id,
            user_id: booking.user_id,
            status: booking.status,
            deposit_amount: booking.deposit.amount,
            deposit_paid: booking.deposit.paid,
            payment_ref: booking.payment_ref,
        });

        if (booking.status !== "pending") {
            throw new AuthException(409, "BOOKING_CANNOT_BE_CONFIRMED");
        }

        if (booking.deposit.amount > 0 && (!booking.deposit.paid || !booking.payment_ref)) {
            throw new AuthException(
                409,
                "BOOKING_CANNOT_BE_CONFIRMED",
                "Booking deposit must be paid and reconciled before confirmation"
            );
        }

        const updatedBooking = await this.repository.update(id, {
            status: "confirmed",
            confirmed_at: booking.confirmed_at ?? new Date().toISOString(),
        });

        await this.afterBookingMutation(booking.venue_id);
        await this.notifyBookingConfirmed(updatedBooking, "manual");
        await this.scheduleBookingReminder(updatedBooking);
        logBookingLifecycle("booking_confirmed", {
            booking_id: updatedBooking.id,
            venue_id: updatedBooking.venue_id,
            user_id: updatedBooking.user_id,
            status: updatedBooking.status,
            deposit_paid: updatedBooking.deposit.paid,
            confirmation_source: "manual",
            confirmed_at: updatedBooking.confirmed_at,
        });

        return updatedBooking;
    }

    // Admin check-in marks a pending/confirmed booking as seated.
    async checkInBooking(id: string) {
        const booking = await this.getExistingBooking(id);

        if (!CHECKIN_ALLOWED_STATUSES.includes(booking.status as typeof CHECKIN_ALLOWED_STATUSES[number])) {
            throw new AuthException(409, "BOOKING_CANNOT_BE_CHECKED_IN");
        }

        const updatedBooking = await this.repository.update(id, {
            status: "seated",
            confirmed_at: booking.confirmed_at ?? new Date().toISOString(),
        });

        await this.afterBookingMutation(booking.venue_id);

        return updatedBooking;
    }

    // Admin manually completes a checked-in booking after the visit is finished.
    async completeBooking(id: string) {
        const booking = await this.getExistingBooking(id);

        if (!COMPLETE_ALLOWED_STATUSES.includes(booking.status as typeof COMPLETE_ALLOWED_STATUSES[number])) {
            throw new AuthException(409, "BOOKING_CANNOT_BE_COMPLETED");
        }

        const updatedBooking = await this.repository.update(id, {
            status: "completed",
        });

        await this.afterBookingMutation(booking.venue_id);
        logBookingLifecycle("booking_completed", {
            booking_id: updatedBooking.id,
            venue_id: updatedBooking.venue_id,
            user_id: updatedBooking.user_id,
            status: updatedBooking.status,
        });

        return updatedBooking;
    }

    async sendUpcomingBookingReminders() {
        const now = new Date();
        const windowStart = new Date(now.getTime() + BOOKING_REMINDER_HOURS_BEFORE * 60 * 60 * 1000);
        const windowEnd = new Date(windowStart.getTime() + BOOKING_REMINDER_WINDOW_MINUTES * 60 * 1000);
        const bookings = await this.repository.listConfirmedBookingsNeedingReminder({
            windowStart,
            windowEnd,
            limit: BOOKING_REMINDER_BATCH_LIMIT,
        });
        const results = [];

        for (const booking of bookings) {
            try {
                const result = await this.bookingNotificationService.sendBookingReminder({ booking });

                if (result.sent) {
                    await this.repository.update(booking.id, {
                        reminder_push_sent_at: new Date().toISOString(),
                    });
                }

                results.push({
                    booking_id: booking.id,
                    user_id: booking.user_id,
                    sent: result.sent,
                    skipped: result.skipped,
                    reason: "reason" in result ? result.reason : null,
                    success_count: result.success_count,
                    failure_count: result.failure_count,
                });
            } catch (error) {
                console.error("Booking reminder push failed", {
                    booking_id: booking.id,
                    error,
                });
                results.push({
                    booking_id: booking.id,
                    user_id: booking.user_id,
                    sent: false,
                    skipped: false,
                    reason: "error",
                    success_count: 0,
                    failure_count: 1,
                });
            }
        }

        return {
            reminder: {
                hours_before: BOOKING_REMINDER_HOURS_BEFORE,
                window_minutes: BOOKING_REMINDER_WINDOW_MINUTES,
                window_start: windowStart.toISOString(),
                window_end: windowEnd.toISOString(),
            },
            scanned_count: bookings.length,
            sent_count: results.filter((result) => result.sent).length,
            skipped_count: results.filter((result) => result.skipped).length,
            failed_count: results.filter((result) => result.reason === "error").length,
            results,
        };
    }

    private async getExistingBooking(id: string) {
        const booking = await this.repository.findById(id);

        if (!booking) {
            throw new AuthException(404, "BOOKING_NOT_FOUND");
        }

        return booking;
    }

    private ensureCanAccessBooking(bookingUserId: string, user: UserProfile) {
        if (bookingUserId !== user.id && user.role !== "admin") {
            throw new AuthException(403, "FORBIDDEN");
        }
    }

    private async afterBookingMutation(venueId: string) {
        await Promise.all([
            incrementVenueAvailabilityCacheVersion(venueId),
            incrementVenueListCacheVersion(),
            this.repository.refreshVenueBookingSummary(venueId),
        ]);
    }

    private async notifyBookingConfirmed(
        booking: Awaited<ReturnType<BookingRepository["findById"]>>,
        source: "payment" | "manual"
    ) {
        if (!booking) {
            return;
        }

        try {
            await this.bookingNotificationService.sendBookingConfirmed({
                booking,
                source,
            });
        } catch (error) {
            console.error("Booking confirmation notification failed", {
                booking_id: booking.id,
                error,
            });
        }
    }

    private async scheduleBookingReminder(
        booking: Awaited<ReturnType<BookingRepository["findById"]>>
    ) {
        if (!booking) {
            return;
        }

        try {
            await this.notificationJobService.scheduleBookingReminder({ booking });
        } catch (error) {
            console.error("Booking reminder job scheduling failed", {
                booking_id: booking.id,
                error,
            });
        }
    }

    private isBookingTimeAllowed(
        openHours: Record<string, string> | null | undefined,
        bookingDate: string,
        bookingTime: string
    ) {
        return this.createAvailabilitySlots(openHours, bookingDate).includes(bookingTime);
    }

    private canCancelBeforeBookingTime(bookingDate: string, bookingTime: string) {
        const bookingAt = new Date(`${bookingDate}T${bookingTime}:00+07:00`);
        const cancelCutoffMs = MIN_CANCEL_HOURS * 60 * 60 * 1000;

        return bookingAt.getTime() - Date.now() > cancelCutoffMs;
    }

    private createAvailabilitySlots(
        openHours: Record<string, string> | null | undefined,
        date: string
    ) {
        const dayKey = DAY_KEYS[this.readDateInVietnamTimezone(date).getDay()];
        const schedule = openHours?.[dayKey];

        if (!schedule) {
            return DEFAULT_TIME_SLOTS;
        }

        if (["closed", "off"].includes(schedule.trim().toLowerCase())) {
            return [];
        }

        const range = schedule.match(/^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/);

        if (!range) {
            return DEFAULT_TIME_SLOTS;
        }

        const start = Number(range[1]) * 60 + Number(range[2]);
        let end = Number(range[3]) * 60 + Number(range[4]);

        if (end <= start) {
            end += 24 * 60;
        }

        const slots: string[] = [];

        for (let minute = start; minute < end; minute += 60) {
            slots.push(this.formatTimeSlot(minute));
        }

        return slots;
    }

    private formatTimeSlot(totalMinutes: number) {
        const minutesInDay = 24 * 60;
        const normalizedMinutes = ((totalMinutes % minutesInDay) + minutesInDay) % minutesInDay;
        const hours = Math.floor(normalizedMinutes / 60).toString().padStart(2, "0");
        const minutes = (normalizedMinutes % 60).toString().padStart(2, "0");

        return `${hours}:${minutes}`;
    }

    private readDateInVietnamTimezone(date: string) {
        return new Date(`${date}T00:00:00+07:00`);
    }
}
