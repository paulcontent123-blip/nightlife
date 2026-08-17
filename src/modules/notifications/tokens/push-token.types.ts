export type PushPlatform = "web" | "ios" | "android";

export interface PushTokenRow {
    id: string;
    user_id: string;
    token: string;
    platform: PushPlatform;
    user_agent: string | null;
    is_active: boolean;
    last_seen_at: string;
    created_at: string;
    updated_at: string;
}

export interface RegisterPushTokenDTO {
    token: string;
    platform?: PushPlatform;
    user_agent?: string | null;
}

export interface DeletePushTokenDTO {
    token: string;
}

export interface PushNotificationPayload {
    title: string;
    body: string;
    data?: Record<string, string | number | boolean | null | undefined>;
    link?: string;
}
