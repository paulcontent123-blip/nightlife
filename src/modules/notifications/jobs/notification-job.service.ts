import { createHash } from "crypto";
import { createSiteUrl } from "@/config/site";
import { logBookingLifecycle } from "@/lib/logger/booking-lifecycle";
import { EventRepository } from "@/modules/events/event.repository";
import { VenueRepository } from "@/modules/venues/venue.repository";
import { NotificationService } from "../notification.service";
import { NotificationJobRepository } from "./notification-job.repository";
import { NotificationPreferenceRepository } from "../preferences/notification-preference.repository";
import type {
    NotificationJobPayload,
    NotificationJobRow,
} from "./notification-job.types";
import type { BookingNotificationPayload } from "../notification.types";

const BOOKING_REMINDER_HOURS_BEFORE = 3;
const EVENT_REMINDER_HOURS_BEFORE = 24;
const HAPPY_HOUR_REMINDER_MINUTES_BEFORE = 15;
const PASSPORT_MILESTONES = [100, 300, 500, 1000] as const;
const DEFAULT_JOB_LIMIT = 50;
const MAX_JOB_LIMIT = 200;
const VIETNAM_TIMEZONE_OFFSET = "+07:00";
const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

export class NotificationJobService {
    constructor(
        private repository = new NotificationJobRepository(),
        private notificationService = new NotificationService(),
        private venueRepository = new VenueRepository(),
        private eventRepository = new EventRepository(),
        private notificationPreferenceRepository = new NotificationPreferenceRepository()
    ) { }

    async scheduleBookingReminder(input: {
        booking: BookingNotificationPayload;
    }) {
        const venue = await this.venueRepository.findById(input.booking.venue_id);
        const scheduledAt = subtractHours(
            createBookingDateTime(input.booking.booking_date, input.booking.booking_time),
            BOOKING_REMINDER_HOURS_BEFORE
        );
        const payload: NotificationJobPayload = {
            title: "Booking reminder",
            body: `Your booking at ${venue?.name ?? "Nightlife.vn"} starts in about 3 hours.`,
            link: createSiteUrl(`/bookings/${input.booking.id}`).toString(),
            data: {
                type: "booking_reminder_3h",
                booking_id: input.booking.id,
                venue_id: input.booking.venue_id,
                booking_date: input.booking.booking_date,
                booking_time: input.booking.booking_time,
            },
        };

        const job = await this.repository.createJob({
            user_id: input.booking.user_id,
            type: "booking_reminder_3h",
            channel: "push",
            scheduled_at: scheduledAt.toISOString(),
            payload,
            source_type: "booking",
            source_id: input.booking.id,
            max_attempts: 3,
        });

        logBookingLifecycle("booking_reminder_job_scheduled", {
            booking_id: input.booking.id,
            user_id: input.booking.user_id,
            scheduled_at: scheduledAt.toISOString(),
            job_id: job?.id ?? null,
        });

        return job;
    }

    async scheduleEventStartsTomorrow(input: {
        eventId: string;
        userId: string;
        orderId?: string;
    }) {
        const event = await this.eventRepository.findAnyById(input.eventId);

        if (!event || !event.is_active) {
            return null;
        }

        const eventStartAt = createDateTime(event.event_date, event.start_time);
        const scheduledAt = subtractHours(eventStartAt, EVENT_REMINDER_HOURS_BEFORE);

        if (scheduledAt.getTime() <= Date.now()) {
            return null;
        }

        const payload: NotificationJobPayload = {
            title: "Event starts tomorrow",
            body: `${event.title} starts tomorrow. Your ticket is ready.`,
            link: createSiteUrl(`/events/${event.slug}`).toString(),
            data: {
                type: "event_starts_tomorrow",
                event_id: event.id,
                order_id: input.orderId,
                event_date: event.event_date,
                start_time: event.start_time,
            },
        };

        return this.repository.createJob({
            user_id: input.userId,
            type: "event_starts_tomorrow",
            channel: "push",
            scheduled_at: scheduledAt.toISOString(),
            payload,
            source_type: "event",
            source_id: event.id,
            max_attempts: 3,
        });
    }

    async scheduleHappyHourStarting(input: {
        deal: {
            id: string;
            title: string;
            start_time: string;
            applicable_days: string[];
            valid_until: string | null;
            is_active: boolean;
        };
        venue: {
            id: string;
            slug: string;
            name: string;
            city: string | null;
            district: string | null;
        };
    }) {
        if (!input.deal.is_active) {
            return {
                scheduled_count: 0,
                skipped_reason: "deal_inactive",
            };
        }

        const scheduledAt = findNextHappyHourNotificationAt(input.deal);

        if (!scheduledAt) {
            return {
                scheduled_count: 0,
                skipped_reason: "no_upcoming_happy_hour",
            };
        }

        const preferences = await this.notificationPreferenceRepository.listHappyHourOptInUsers({
            city: input.venue.city,
            district: input.venue.district,
        });
        const payload: NotificationJobPayload = {
            title: "Happy Hour starting soon",
            body: `${input.deal.title} at ${input.venue.name} starts in about 15 minutes.`,
            link: createSiteUrl(`/venues/${input.venue.slug}`).toString(),
            data: {
                type: "happy_hour_starting",
                deal_id: input.deal.id,
                venue_id: input.venue.id,
                scheduled_for: scheduledAt.toISOString(),
            },
        };
        const jobs = await Promise.all(preferences.map((preference) =>
            this.repository.createOrRefreshPendingJob({
                user_id: preference.user_id,
                type: "happy_hour_starting",
                channel: "push",
                scheduled_at: scheduledAt.toISOString(),
                payload,
                source_type: "deal",
                source_id: input.deal.id,
                max_attempts: 3,
            })
        ));

        return {
            scheduled_count: jobs.filter(Boolean).length,
            scheduled_at: scheduledAt.toISOString(),
            opt_in_user_count: preferences.length,
        };
    }

    async notifyPassportMilestoneNow(input: {
        userId: string;
        milestone: number;
        balance: number;
    }) {
        if (!PASSPORT_MILESTONES.some((milestone) => milestone === input.milestone)) {
            return null;
        }

        const payload: NotificationJobPayload = {
            title: "Passport milestone reached",
            body: `You reached ${input.milestone} Passport Points. New rewards are waiting.`,
            link: createSiteUrl("/passport/rewards").toString(),
            data: {
                type: "passport_milestone",
                milestone: input.milestone,
                balance: input.balance,
            },
        };
        const job = await this.repository.createJob({
            user_id: input.userId,
            type: "passport_milestone",
            channel: "push",
            scheduled_at: new Date().toISOString(),
            payload,
            source_type: "passport_milestone",
            source_id: createStableUuid(`passport_milestone:${input.userId}:${input.milestone}`),
            max_attempts: 3,
        });

        if (!job || job.status === "sent") {
            return job;
        }

        return this.processJob(job);
    }

    getPassportMilestonesCrossed(input: {
        before: number;
        after: number;
    }) {
        if (input.after <= input.before) {
            return [];
        }

        return PASSPORT_MILESTONES.filter((milestone) =>
            input.before < milestone && input.after >= milestone
        );
    }

    async processDueJobs(input: {
        limit?: number;
    } = {}) {
        const now = new Date().toISOString();
        const limit = Math.min(Math.max(input.limit ?? DEFAULT_JOB_LIMIT, 1), MAX_JOB_LIMIT);
        const pendingJobs = await this.repository.listDuePendingJobs({ now, limit });
        const results = [];

        for (const pendingJob of pendingJobs) {
            const claimedJob = await this.repository.claimJob(pendingJob.id, new Date().toISOString());

            if (!claimedJob) {
                continue;
            }

            results.push(await this.processJob(claimedJob));
        }

        return {
            scanned_count: pendingJobs.length,
            processed_count: results.length,
            sent_count: results.filter((result) => result.status === "sent").length,
            failed_count: results.filter((result) => result.status === "failed").length,
            retry_count: results.filter((result) => result.status === "pending").length,
            results,
        };
    }

    private async processJob(job: NotificationJobRow) {
        try {
            if (job.channel !== "push") {
                return this.failOrRetryJob(job, `Unsupported notification channel: ${job.channel}`);
            }

            if (!job.user_id) {
                return this.failOrRetryJob(job, "Notification job is missing user_id");
            }

            const pushResult = await this.notificationService.sendPushToUser(job.user_id, job.payload);

            if (pushResult.sent || pushResult.reason === "no_active_tokens") {
                await this.repository.updateJob(job.id, {
                    status: "sent",
                    sent_at: new Date().toISOString(),
                    locked_at: null,
                    last_error: pushResult.sent ? null : "skipped:no_active_tokens",
                });

                return {
                    job_id: job.id,
                    type: job.type,
                    status: "sent" as const,
                    push: pushResult,
                };
            }

            return this.failOrRetryJob(job, pushResult.reason ?? "Push notification failed");
        } catch (error) {
            return this.failOrRetryJob(job, error instanceof Error ? error.message : "Notification job failed");
        }
    }

    private async failOrRetryJob(job: NotificationJobRow, errorMessage: string) {
        const nextAttemptCount = job.attempt_count + 1;
        const shouldRetry = nextAttemptCount < job.max_attempts;
        const status = shouldRetry ? "pending" : "failed";

        await this.repository.updateJob(job.id, {
            status,
            attempt_count: nextAttemptCount,
            locked_at: null,
            last_error: errorMessage,
        });

        return {
            job_id: job.id,
            type: job.type,
            status,
            attempt_count: nextAttemptCount,
            error: errorMessage,
        };
    }
}

function createBookingDateTime(bookingDate: string, bookingTime: string) {
    return createDateTime(bookingDate, bookingTime);
}

function createDateTime(date: string, time: string) {
    return new Date(`${date}T${normalizeTime(time)}:00${VIETNAM_TIMEZONE_OFFSET}`);
}

function normalizeTime(value: string) {
    const match = value.match(/^(\d{2}:\d{2})/);

    return match?.[1] ?? value;
}

function subtractHours(date: Date, hours: number) {
    return new Date(date.getTime() - hours * 60 * 60 * 1000);
}

function findNextHappyHourNotificationAt(deal: {
    start_time: string;
    applicable_days: string[];
    valid_until: string | null;
}) {
    const now = new Date();
    const todayKey = getVietnamDateKey(now);
    const startMinutes = parseTimeToMinutes(deal.start_time);

    if (startMinutes === null) {
        return null;
    }

    for (let offset = 0; offset < 14; offset += 1) {
        const candidateDate = addDays(createNoonUtcDate(todayKey), offset);
        const candidateDateKey = formatDateKey(candidateDate);

        if (deal.valid_until && candidateDateKey > deal.valid_until) {
            continue;
        }

        const dayKey = DAY_KEYS[candidateDate.getUTCDay()];

        if (deal.applicable_days.length > 0 && !deal.applicable_days.includes(dayKey)) {
            continue;
        }

        const startAt = createDateTime(candidateDateKey, minutesToTime(startMinutes));

        if (startAt.getTime() <= now.getTime()) {
            continue;
        }

        const notificationAt = new Date(startAt.getTime() - HAPPY_HOUR_REMINDER_MINUTES_BEFORE * 60 * 1000);

        return notificationAt.getTime() <= now.getTime() ? now : notificationAt;
    }

    return null;
}

function parseTimeToMinutes(value: string) {
    const match = value.match(/^(\d{1,2}):(\d{2})/);

    if (!match) {
        return null;
    }

    return Number(match[1]) * 60 + Number(match[2]);
}

function minutesToTime(minutes: number) {
    const hour = Math.floor(minutes / 60).toString().padStart(2, "0");
    const minute = (minutes % 60).toString().padStart(2, "0");

    return `${hour}:${minute}`;
}

function getVietnamDateKey(date: Date) {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Ho_Chi_Minh",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(date);
}

function createNoonUtcDate(dateKey: string) {
    return new Date(`${dateKey}T12:00:00.000Z`);
}

function addDays(date: Date, days: number) {
    return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function formatDateKey(date: Date) {
    return date.toISOString().slice(0, 10);
}

function createStableUuid(value: string) {
    const hash = createHash("sha256").update(value).digest("hex").slice(0, 32);

    return [
        hash.slice(0, 8),
        hash.slice(8, 12),
        `4${hash.slice(13, 16)}`,
        `${(parseInt(hash.slice(16, 18), 16) & 0x3f | 0x80).toString(16).padStart(2, "0")}${hash.slice(18, 20)}`,
        hash.slice(20, 32),
    ].join("-");
}
