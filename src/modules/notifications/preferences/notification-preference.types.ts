export interface NotificationPreferenceRow {
    user_id: string;
    happy_hour_push_enabled: boolean;
    happy_hour_city: string | null;
    happy_hour_district: string | null;
    created_at: string;
    updated_at: string;
}

export interface UpdateNotificationPreferenceDTO {
    happy_hour_push_enabled?: boolean;
    happy_hour_city?: "hcm" | "hanoi" | "danang" | null;
    happy_hour_district?: string | null;
}
