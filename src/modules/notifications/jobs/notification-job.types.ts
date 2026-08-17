export type NotificationJobType =
    | "booking_reminder_3h"
    | "event_starts_tomorrow"
    | "happy_hour_starting"
    | "forum_reply"
    | "passport_milestone"
    | "membership_expiring";

export type NotificationJobChannel = "push" | "email" | "push_email";
export type NotificationJobStatus = "pending" | "processing" | "sent" | "failed" | "cancelled";

export interface NotificationJobPayload {
    title: string;
    body: string;
    link?: string;
    data?: Record<string, string | number | boolean | null | undefined>;
}

export interface NotificationJobRow {
    id: string;
    user_id: string | null;
    type: NotificationJobType;
    channel: NotificationJobChannel;
    scheduled_at: string;
    status: NotificationJobStatus;
    payload: NotificationJobPayload;
    source_type: string | null;
    source_id: string | null;
    attempt_count: number;
    max_attempts: number;
    locked_at: string | null;
    sent_at: string | null;
    last_error: string | null;
    created_at: string;
    updated_at: string;
}

export interface NotificationJobRecord {
    user_id: string | null;
    type: NotificationJobType;
    channel: NotificationJobChannel;
    scheduled_at: string;
    status?: NotificationJobStatus;
    payload: NotificationJobPayload;
    source_type?: string | null;
    source_id?: string | null;
    max_attempts?: number;
}

export interface NotificationJobUpdate {
    scheduled_at?: string;
    payload?: NotificationJobPayload;
    status?: NotificationJobStatus;
    attempt_count?: number;
    locked_at?: string | null;
    sent_at?: string | null;
    last_error?: string | null;
}
