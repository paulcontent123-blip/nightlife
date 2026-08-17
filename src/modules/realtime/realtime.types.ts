export type RealtimeFeature =
    | "venue_availability"
    | "squad_members"
    | "event_checkin_counter";

export interface RealtimeChannelConfig {
    feature: RealtimeFeature;
    channel: string;
    schema: "public";
    table: "bookings" | "squad_members" | "tickets";
    event: "*" | "INSERT" | "UPDATE";
    filter: string;
    audience: "public" | "authenticated" | "admin";
    purpose: string;
}

export interface RealtimeConfigResult {
    provider: "supabase_realtime";
    status: "backend_ready";
    publication_tables: Array<"bookings" | "squad_members" | "tickets">;
    channels: RealtimeChannelConfig[];
    frontend: {
        client_import: "@/lib/supabase/client";
        required_env: string[];
    };
    notes: string[];
}
