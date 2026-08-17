"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type RealtimeTable = "bookings" | "squad_members" | "tickets";
type RealtimeEvent = "*" | "INSERT" | "UPDATE" | "DELETE";

interface RealtimeRefreshProps {
    channelName: string;
    table: RealtimeTable;
    event?: RealtimeEvent;
    filter?: string;
    enabled?: boolean;
}

export function RealtimeRefresh({
    channelName,
    table,
    event = "*",
    filter,
    enabled = true,
}: RealtimeRefreshProps) {
    const router = useRouter();

    useEffect(() => {
        if (!enabled) {
            return;
        }

        let refreshTimer: ReturnType<typeof setTimeout> | null = null;
        const channel = supabase
            .channel(channelName)
            .on(
                "postgres_changes",
                {
                    event,
                    schema: "public",
                    table,
                    ...(filter ? { filter } : {}),
                },
                () => {
                    if (refreshTimer) {
                        clearTimeout(refreshTimer);
                    }

                    refreshTimer = setTimeout(() => router.refresh(), 150);
                }
            )
            .subscribe();

        return () => {
            if (refreshTimer) {
                clearTimeout(refreshTimer);
            }

            void supabase.removeChannel(channel);
        };
    }, [channelName, enabled, event, filter, router, table]);

    return null;
}
