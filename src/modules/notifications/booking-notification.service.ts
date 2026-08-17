import {
    getResendOperationsEmail,
} from "@/config/resend";
import { createSiteUrl } from "@/config/site";
import { logBookingLifecycle } from "@/lib/logger/booking-lifecycle";
import { AuthRepository } from "@/modules/auth/auth.repository";
import { VenueRepository } from "@/modules/venues/venue.repository";
import { NotificationService } from "./notification.service";
import {
    renderAdminBookingConfirmedEmail,
    renderUserBookingConfirmedEmail,
} from "./templates/booking-email.templates";
import { createBookingCalendarAttachment } from "./templates/calendar";
import type {
    BookingConfirmationSource,
    BookingNotificationPayload,
} from "./notification.types";

export class BookingNotificationService {
    constructor(
        private authRepository = new AuthRepository(),
        private venueRepository = new VenueRepository(),
        private notificationService = new NotificationService()
    ) { }

    async sendBookingConfirmed(input: {
        booking: BookingNotificationPayload;
        source: BookingConfirmationSource;
    }) {
        const [user, venue] = await Promise.all([
            this.authRepository.findById(input.booking.user_id),
            this.venueRepository.findById(input.booking.venue_id),
        ]);

        if (!user || !venue) {
            logBookingLifecycle("booking_confirmation_email_skipped", {
                booking_id: input.booking.id,
                user_id: input.booking.user_id,
                venue_id: input.booking.venue_id,
                reason: "missing_user_or_venue",
            });
            console.warn("Skipping booking confirmation emails because user or venue was not found", {
                booking_id: input.booking.id,
                user_id: input.booking.user_id,
                venue_id: input.booking.venue_id,
            });
            return;
        }

        const notificationResults = await Promise.allSettled([
            this.sendBookingConfirmedEmail(input, user, venue),
            this.sendBookingConfirmedPush(input, venue),
        ]);

        const failedNotifications = notificationResults.filter((result) => result.status === "rejected");

        if (failedNotifications.length > 0) {
            console.error("Some booking confirmation notifications failed", {
                booking_id: input.booking.id,
                failed_count: failedNotifications.length,
            });
        }
    }

    async sendBookingReminder(input: {
        booking: BookingNotificationPayload;
    }) {
        const venue = await this.venueRepository.findById(input.booking.venue_id);

        if (!venue) {
            logBookingLifecycle("booking_reminder_push_skipped", {
                booking_id: input.booking.id,
                venue_id: input.booking.venue_id,
                reason: "missing_venue",
            });
            return {
                sent: false,
                skipped: true,
                reason: "missing_venue",
                success_count: 0,
                failure_count: 0,
            };
        }

        const result = await this.notificationService.sendPushToUser(input.booking.user_id, {
            title: "Booking reminder",
            body: `Your booking at ${venue.name} starts in about 3 hours.`,
            link: createSiteUrl(`/bookings/${input.booking.id}`).toString(),
            data: {
                type: "booking_reminder_3h",
                booking_id: input.booking.id,
                venue_id: input.booking.venue_id,
                booking_date: input.booking.booking_date,
                booking_time: input.booking.booking_time,
            },
        });

        logBookingLifecycle("booking_reminder_push_processed", {
            booking_id: input.booking.id,
            venue_id: input.booking.venue_id,
            user_id: input.booking.user_id,
            sent: result.sent,
            skipped: result.skipped,
            success_count: result.success_count,
            failure_count: result.failure_count,
        });

        return result;
    }

    private async sendBookingConfirmedEmail(
        input: {
            booking: BookingNotificationPayload;
            source: BookingConfirmationSource;
        },
        user: NonNullable<Awaited<ReturnType<AuthRepository["findById"]>>>,
        venue: NonNullable<Awaited<ReturnType<VenueRepository["findById"]>>>
    ) {
        if (!this.notificationService.isEmailConfigured()) {
            logBookingLifecycle("booking_confirmation_email_skipped", {
                booking_id: input.booking.id,
                reason: "missing_resend_api_key",
            });
            console.warn("Skipping booking confirmation emails because RESEND_API_KEY is not configured");
            return;
        }

        const calendarAttachment = createBookingCalendarAttachment(input.booking, venue);
        const userEmail = renderUserBookingConfirmedEmail({
            booking: input.booking,
            venue,
            user,
            source: input.source,
        });
        const operationsEmail = getResendOperationsEmail();
        logBookingLifecycle("booking_confirmation_email_requested", {
            booking_id: input.booking.id,
            venue_id: input.booking.venue_id,
            user_id: input.booking.user_id,
            confirmation_source: input.source,
            user_email_configured: Boolean(user.email),
            operations_email_configured: Boolean(operationsEmail),
        });

        const sendTasks = [
            this.notificationService.sendEmail({
                to: user.email,
                subject: userEmail.subject,
                html: userEmail.html,
                text: userEmail.text,
                attachments: [calendarAttachment],
            }),
        ];

        if (operationsEmail) {
            const adminEmail = renderAdminBookingConfirmedEmail({
                booking: input.booking,
                venue,
                user,
                source: input.source,
            });

            sendTasks.push(this.notificationService.sendEmail({
                to: operationsEmail,
                subject: adminEmail.subject,
                html: adminEmail.html,
                text: adminEmail.text,
            }));
        }

        const results = await Promise.allSettled(sendTasks);
        const failed = results.filter((result) => result.status === "rejected");

        if (failed.length > 0) {
            logBookingLifecycle("booking_confirmation_email_failed", {
                booking_id: input.booking.id,
                failed_count: failed.length,
                total_count: results.length,
            });
            console.error("Some booking confirmation emails failed", {
                booking_id: input.booking.id,
                failed_count: failed.length,
            });
            return;
        }

        logBookingLifecycle("booking_confirmation_email_sent", {
            booking_id: input.booking.id,
            total_count: results.length,
            operations_email_sent: Boolean(operationsEmail),
        });
    }

    private async sendBookingConfirmedPush(
        input: {
            booking: BookingNotificationPayload;
            source: BookingConfirmationSource;
        },
        venue: NonNullable<Awaited<ReturnType<VenueRepository["findById"]>>>
    ) {
        const result = await this.notificationService.sendPushToUser(input.booking.user_id, {
            title: "Booking confirmed",
            body: `${venue.name} confirmed your booking at ${input.booking.booking_time}.`,
            link: createSiteUrl(`/bookings/${input.booking.id}`).toString(),
            data: {
                type: "booking_confirmed",
                booking_id: input.booking.id,
                venue_id: input.booking.venue_id,
                source: input.source,
            },
        });

        logBookingLifecycle("booking_confirmation_push_processed", {
            booking_id: input.booking.id,
            user_id: input.booking.user_id,
            sent: result.sent,
            skipped: result.skipped,
            success_count: result.success_count,
            failure_count: result.failure_count,
        });
    }
}
