import type { RealtimeChannelConfig, RealtimeConfigResult } from "./realtime.types";

const DEFAULT_PLACEHOLDERS = {
    venueId: "{venue_id}",
    squadId: "{squad_id}",
    eventId: "{event_id}",
};

export class RealtimeService {
    getChannels(searchParams: URLSearchParams): RealtimeConfigResult {
        const venueId = readParam(searchParams, "venue_id") ?? DEFAULT_PLACEHOLDERS.venueId;
        const squadId = readParam(searchParams, "squad_id") ?? DEFAULT_PLACEHOLDERS.squadId;
        const eventId = readParam(searchParams, "event_id") ?? DEFAULT_PLACEHOLDERS.eventId;

        const channels: RealtimeChannelConfig[] = [
            {
                feature: "venue_availability",
                channel: `venue-availability-${venueId}`,
                schema: "public",
                table: "bookings",
                event: "*",
                filter: `venue_id=eq.${venueId}`,
                audience: "public",
                purpose: "Update availability/list UI when a booking is created, confirmed, cancelled, checked in or completed.",
            },
            {
                feature: "squad_members",
                channel: `squad-${squadId}`,
                schema: "public",
                table: "squad_members",
                event: "*",
                filter: `squad_id=eq.${squadId}`,
                audience: "authenticated",
                purpose: "Update squad member list, joined status and bill-share state.",
            },
            {
                feature: "event_checkin_counter",
                channel: `event-${eventId}-checkins`,
                schema: "public",
                table: "tickets",
                event: "UPDATE",
                filter: `event_id=eq.${eventId}`,
                audience: "admin",
                purpose: "Update event-day checked-in ticket counter after QR scan.",
            },
        ];

        return {
            provider: "supabase_realtime",
            status: "backend_ready",
            publication_tables: ["bookings", "squad_members", "tickets"],
            channels,
            frontend: {
                client_import: "@/lib/supabase/client",
                required_env: [
                    "NEXT_PUBLIC_SUPABASE_URL",
                    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
                ],
            },
            notes: [
                "Backend publishes database changes through Supabase Realtime; frontend will subscribe with supabase.channel(...).on('postgres_changes', ...).",
                "RLS still controls which rows authenticated clients can receive.",
                "Use query params venue_id, squad_id and event_id to generate concrete channel filters for a screen.",
            ],
        };
    }
}

function readParam(searchParams: URLSearchParams, key: string) {
    const value = searchParams.get(key)?.trim();

    return value && value.length > 0 ? value : null;
}
