import { createAdminClient } from "@/lib/supabase/admin";
import { AuthException } from "@/modules/auth/auth.errors";
import { mapEvent } from "./event.mapper";
import type { EventListQuery, EventRecord, EventRow } from "./event.types";

const EVENTS_TABLE = "events";

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
        const from = (query.page - 1) * query.limit;
        const to = from + query.limit - 1;
        let request = this.supabase
            .from(EVENTS_TABLE)
            .select("*", { count: "exact" })
            .eq("is_active", true);

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

    async listPublicByVenue(venueId: string, query: EventListQuery) {
        return this.listByVenue(venueId, {
            ...query,
            is_active: true,
        });
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
