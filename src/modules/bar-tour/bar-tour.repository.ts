import { createAdminClient } from "@/lib/supabase/admin";
import { AuthException } from "@/modules/auth/auth.errors";
import type { DealRow } from "@/modules/deals/deal.types";
import type { EventRow } from "@/modules/events/event.types";
import type { VenueRow } from "@/modules/venues/venue.types";
import type { BarTourRecommendationQuery } from "./bar-tour.types";

const VENUES_TABLE = "venues";
const DEALS_TABLE = "deals";
const EVENTS_TABLE = "events";
const CANDIDATE_LIMIT = 200;
const RELATED_LIMIT = 80;

export class BarTourRepository {
    private get supabase() {
        return createAdminClient();
    }

    async listVenueCandidates(query: BarTourRecommendationQuery) {
        let request = this.supabase
            .from(VENUES_TABLE)
            .select("*")
            .eq("is_active", true);

        if (query.city) {
            request = request.eq("city", query.city);
        }

        if (query.district) {
            request = request.eq("district", query.district);
        }

        if (query.price_range) {
            request = request.eq("price_range", query.price_range);
        }

        const { data, error } = await request
            .order("avg_rating", { ascending: false, nullsFirst: false })
            .order("total_bookings", { ascending: false })
            .limit(CANDIDATE_LIMIT)
            .returns<VenueRow[]>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return data ?? [];
    }

    async listActiveDealsForVenues(venueIds: string[]) {
        if (venueIds.length === 0) {
            return [];
        }

        const today = getVietnamDate();
        const { data, error } = await this.supabase
            .from(DEALS_TABLE)
            .select("*")
            .in("venue_id", venueIds)
            .eq("is_active", true)
            .or(`valid_until.is.null,valid_until.gte.${today}`)
            .order("created_at", { ascending: false })
            .limit(RELATED_LIMIT)
            .returns<DealRow[]>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return data ?? [];
    }

    async listUpcomingEventsForVenues(venueIds: string[]) {
        if (venueIds.length === 0) {
            return [];
        }

        const { data, error } = await this.supabase
            .from(EVENTS_TABLE)
            .select("*")
            .in("venue_id", venueIds)
            .eq("is_active", true)
            .gte("event_date", getVietnamDate())
            .order("event_date", { ascending: true })
            .order("start_time", { ascending: true })
            .limit(RELATED_LIMIT)
            .returns<EventRow[]>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return data ?? [];
    }
}

function getVietnamDate() {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Ho_Chi_Minh",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(new Date());
}
