import { createAdminClient } from "@/lib/supabase/admin";
import { AuthException } from "@/modules/auth/auth.errors";
import { mapEvent, mapEventList } from "./event.mapper";
import type { EventListQuery, EventListRow, EventRecord, EventRow } from "./event.types";

const EVENTS_TABLE = "events";
const EVENT_LIST_COLUMNS = [
    "id",
    "slug",
    "venue_id",
    "title",
    "event_date",
    "start_time",
    "end_time",
    "genre",
    "thumbnail_url",
    "is_free",
    "age_restriction",
    "total_capacity",
    "is_active",
    "created_at",
].join(",");

type UpdateEventRecord = Partial<EventRecord>;

export class EventRepository {
    private get supabase() {
        return createAdminClient();
    }

    async listByVenue(venueId: string, query: EventListQuery) {
        const from = (query.page - 1) * query.limit;
        const to = from + query.limit - 1;
        let request = this.supabase
            .from(EVENTS_TABLE)
            .select("*", { count: "exact" })
            .eq("venue_id", venueId);

        if (query.is_active !== undefined) {
            request = request.eq("is_active", query.is_active);
        }

        if (query.date_from) {
            request = request.gte("event_date", query.date_from);
        }

        if (query.date_to) {
            request = request.lte("event_date", query.date_to);
        }

        if (query.genre) {
            request = request.contains("genre", [query.genre]);
        }

        const { data, error, count } = await request
            .order("event_date", { ascending: true })
            .order("start_time", { ascending: true })
            .range(from, to)
            .returns<EventRow[]>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        const total = count ?? 0;

        return {
            items: (data ?? []).map(mapEvent),
            pagination: {
                page: query.page,
                limit: query.limit,
                total,
                total_pages: Math.ceil(total / query.limit),
            },
        };
    }

    async listPublic(query: EventListQuery) {
        return this.listPublicQuery(query);
    }

    async listPublicByVenue(venueId: string, query: EventListQuery) {
        return this.listPublicQuery(query, venueId);
    }

    private async listPublicQuery(query: EventListQuery, venueId?: string) {
        const from = (query.page - 1) * query.limit;
        const to = from + query.limit - 1;
        // "planned" uses Postgres's stale table-statistics estimate instead of a
        // real COUNT(*); confirmed live in production to diverge wildly after
        // bulk seeding (claimed 11 pages / 125 rows while only ~3 rows existed),
        // silently returning empty results on every page past the first.
        let request = this.supabase
            .from(EVENTS_TABLE)
            .select(EVENT_LIST_COLUMNS, { count: "exact" })
            .eq("is_active", true);

        if (venueId) {
            request = request.eq("venue_id", venueId);
        }

        if (query.date_from) {
            request = request.gte("event_date", query.date_from);
        }

        if (query.date_to) {
            request = request.lte("event_date", query.date_to);
        }

        if (query.genre) {
            request = request.contains("genre", [query.genre]);
        }

        const { data, error, count } = await request
            .order("event_date", { ascending: true })
            .order("start_time", { ascending: true })
            .range(from, to)
            .returns<EventListRow[]>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        const total = count ?? 0;

        return {
            items: (data ?? []).map(mapEventList),
            pagination: {
                page: query.page,
                limit: query.limit,
                total,
                total_pages: Math.ceil(total / query.limit),
            },
        };
    }

    async findById(venueId: string, eventId: string) {
        const { data, error } = await this.supabase
            .from(EVENTS_TABLE)
            .select("*")
            .eq("venue_id", venueId)
            .eq("id", eventId)
            .maybeSingle<EventRow>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return data ? mapEvent(data) : null;
    }

    async findAnyById(eventId: string) {
        const { data, error } = await this.supabase
            .from(EVENTS_TABLE)
            .select("*")
            .eq("id", eventId)
            .maybeSingle<EventRow>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return data ? mapEvent(data) : null;
    }

    async findPublicBySlug(slug: string) {
        const { data, error } = await this.supabase
            .from(EVENTS_TABLE)
            .select("*")
            .eq("slug", slug)
            .eq("is_active", true)
            .maybeSingle<EventRow>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return data ? mapEvent(data) : null;
    }

    async create(input: EventRecord) {
        const { data, error } = await this.supabase
            .from(EVENTS_TABLE)
            .insert(input)
            .select("*")
            .single<EventRow>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return mapEvent(data);
    }

    async update(venueId: string, eventId: string, input: UpdateEventRecord) {
        const { data, error } = await this.supabase
            .from(EVENTS_TABLE)
            .update(input)
            .eq("venue_id", venueId)
            .eq("id", eventId)
            .select("*")
            .single<EventRow>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return mapEvent(data);
    }

    async softDelete(venueId: string, eventId: string) {
        return this.update(venueId, eventId, {
            is_active: false,
        });
    }

    async slugExists(slug: string, excludeEventId?: string) {
        let request = this.supabase
            .from(EVENTS_TABLE)
            .select("id")
            .eq("slug", slug);

        if (excludeEventId) {
            request = request.neq("id", excludeEventId);
        }

        const { data, error } = await request.maybeSingle<{ id: string }>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return Boolean(data);
    }
}
