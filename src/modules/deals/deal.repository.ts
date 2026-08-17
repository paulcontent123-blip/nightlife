import { createAdminClient } from "@/lib/supabase/admin";
import { AuthException } from "@/modules/auth/auth.errors";
import { mapDeal, mapPublicDeal } from "./deal.mapper";
import type { DealListQuery, DealRecord, DealRow, DealRowWithVenue } from "./deal.types";

const DEALS_TABLE = "deals";
const VENUES_TABLE = "venues";
const PUBLIC_DEAL_FETCH_LIMIT = 5000;

type UpdateDealRecord = Partial<DealRecord>;

export class DealRepository {
    private get supabase() {
        return createAdminClient();
    }

    async listByVenue(venueId: string, query: DealListQuery) {
        const from = (query.page - 1) * query.limit;
        const to = from + query.limit - 1;
        let request = this.supabase
            .from(DEALS_TABLE)
            .select("*", { count: "exact" })
            .eq("venue_id", venueId);

        if (query.is_active !== undefined) {
            request = request.eq("is_active", query.is_active);
        }

        if (query.is_exclusive !== undefined) {
            request = request.eq("is_exclusive", query.is_exclusive);
        }

        if (query.day) {
            request = request.contains("applicable_days", [query.day]);
        }

        const { data, error, count } = await request
            .order("created_at", { ascending: false })
            .range(from, to)
            .returns<DealRow[]>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        const total = count ?? 0;

        return {
            items: (data ?? []).map(mapDeal),
            pagination: {
                page: query.page,
                limit: query.limit,
                total,
                total_pages: Math.ceil(total / query.limit),
            },
        };
    }

    async listPublic(query: DealListQuery, includeExclusiveDeals = false) {
        const today = getVietnamDate();
        let request = this.supabase
            .from(DEALS_TABLE)
            .select("*, venues!inner(id, name, slug, city, district, is_active)", { count: "exact" })
            .eq("is_active", true)
            .eq("venues.is_active", true)
            .or(`valid_until.is.null,valid_until.gte.${today}`);

        if (query.city) {
            request = request.eq("venues.city", query.city);
        }

        if (query.district) {
            request = request.eq("venues.district", query.district);
        }

        if (!includeExclusiveDeals) {
            request = request.eq("is_exclusive", false);
        } else if (query.is_exclusive !== undefined) {
            request = request.eq("is_exclusive", query.is_exclusive);
        }

        if (query.day) {
            request = request.contains("applicable_days", [query.day]);
        }

        const shouldFilterOpenNow = query.is_open_now === true
            || query.active_now === true
            || query.happy_hour_now === true;
        request = request.range(0, PUBLIC_DEAL_FETCH_LIMIT - 1);

        const { data, error } = await request
            .order("created_at", { ascending: false })
            .returns<DealRowWithVenue[]>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return this.createDealListResult(data ?? [], query, shouldFilterOpenNow, 0, mapPublicDeal);
    }

    async listPublicByVenueId(venueId: string, query: DealListQuery, includeExclusiveDeals = false) {
        const { data: venue, error: venueError } = await this.supabase
            .from(VENUES_TABLE)
            .select("id")
            .eq("id", venueId)
            .eq("is_active", true)
            .maybeSingle<{ id: string }>();

        if (venueError) {
            throw new AuthException(500, "DATABASE_ERROR", venueError.message);
        }

        if (!venue) {
            throw new AuthException(404, "VENUE_NOT_FOUND");
        }

        const today = getVietnamDate();
        let request = this.supabase
            .from(DEALS_TABLE)
            .select("*", { count: "exact" })
            .eq("venue_id", venue.id)
            .eq("is_active", true)
            .or(`valid_until.is.null,valid_until.gte.${today}`);

        if (!includeExclusiveDeals) {
            request = request.eq("is_exclusive", false);
        } else if (query.is_exclusive !== undefined) {
            request = request.eq("is_exclusive", query.is_exclusive);
        }

        if (query.day) {
            request = request.contains("applicable_days", [query.day]);
        }

        const shouldFilterOpenNow = query.is_open_now === true
            || query.active_now === true
            || query.happy_hour_now === true;
        request = request.range(0, PUBLIC_DEAL_FETCH_LIMIT - 1);

        const { data, error } = await request
            .order("created_at", { ascending: false })
            .returns<DealRow[]>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return this.createDealListResult(data ?? [], query, shouldFilterOpenNow, 0);
    }

    async listPublicByVenueSlug(slug: string, query: DealListQuery, includeExclusiveDeals = false) {
        const { data: venue, error: venueError } = await this.supabase
            .from(VENUES_TABLE)
            .select("id")
            .eq("slug", slug)
            .eq("is_active", true)
            .maybeSingle<{ id: string }>();

        if (venueError) {
            throw new AuthException(500, "DATABASE_ERROR", venueError.message);
        }

        if (!venue) {
            throw new AuthException(404, "VENUE_NOT_FOUND");
        }

        const today = getVietnamDate();
        let request = this.supabase
            .from(DEALS_TABLE)
            .select("*", { count: "exact" })
            .eq("venue_id", venue.id)
            .eq("is_active", true)
            .or(`valid_until.is.null,valid_until.gte.${today}`);

        if (!includeExclusiveDeals) {
            request = request.eq("is_exclusive", false);
        } else if (query.is_exclusive !== undefined) {
            request = request.eq("is_exclusive", query.is_exclusive);
        }

        if (query.day) {
            request = request.contains("applicable_days", [query.day]);
        }

        const shouldFilterNow = query.is_open_now === true
            || query.active_now === true
            || query.happy_hour_now === true;
        request = request.range(0, PUBLIC_DEAL_FETCH_LIMIT - 1);

        const { data, error } = await request
            .order("created_at", { ascending: false })
            .returns<DealRow[]>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return this.createDealListResult(data ?? [], query, shouldFilterNow, 0);
    }

    async findById(venueId: string, dealId: string) {
        const { data, error } = await this.supabase
            .from(DEALS_TABLE)
            .select("*")
            .eq("venue_id", venueId)
            .eq("id", dealId)
            .maybeSingle<DealRow>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return data ? mapDeal(data) : null;
    }

    async create(input: DealRecord) {
        const { data, error } = await this.supabase
            .from(DEALS_TABLE)
            .insert(input)
            .select("*")
            .single<DealRow>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return mapDeal(data);
    }

    async update(venueId: string, dealId: string, input: UpdateDealRecord) {
        const { data, error } = await this.supabase
            .from(DEALS_TABLE)
            .update(input)
            .eq("venue_id", venueId)
            .eq("id", dealId)
            .select("*")
            .single<DealRow>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return mapDeal(data);
    }

    async softDelete(venueId: string, dealId: string) {
        return this.update(venueId, dealId, {
            is_active: false,
        });
    }

    private createDealListResult<TRow extends DealRow, TMapped>(
        rows: TRow[],
        query: DealListQuery,
        shouldFilterNow: boolean,
        dbTotal: number,
        mapRow: (row: TRow) => TMapped = mapDeal as unknown as (row: TRow) => TMapped
    ) {
        const from = (query.page - 1) * query.limit;
        const to = from + query.limit;
        const filteredRows = shouldFilterNow
            ? rows.filter(isDealOpenNow)
            : rows.filter(isDealActiveToday);
        const pageRows = shouldFilterNow || dbTotal === 0
            ? filteredRows.slice(from, to)
            : filteredRows;
        const total = shouldFilterNow || dbTotal === 0 ? filteredRows.length : dbTotal;

        return {
            items: pageRows.map((row) => ({
                ...mapRow(row),
                is_active_today: isDealActiveToday(row),
                is_open_now: isDealOpenNow(row),
            })),
            pagination: {
                page: query.page,
                limit: query.limit,
                total,
                total_pages: Math.ceil(total / query.limit),
            },
        };
    }
}

const VIETNAM_TIMEZONE = "Asia/Ho_Chi_Minh";
const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

function isDealActiveToday(deal: DealRow) {
    if (!deal.is_active) {
        return false;
    }

    if (deal.valid_until && deal.valid_until < getVietnamDate()) {
        return false;
    }

    const { dayKey } = getVietnamNowParts();
    const applicableDays = deal.applicable_days ?? [];

    if (applicableDays.length > 0 && !applicableDays.includes(dayKey)) {
        return false;
    }

    return true;
}

function isDealOpenNow(deal: DealRow) {
    if (!isDealActiveToday(deal)) {
        return false;
    }

    const { minutes } = getVietnamNowParts();

    return isWithinTimeRange(deal.start_time, deal.end_time, minutes);
}

function isWithinTimeRange(startTime: string, endTime: string, currentMinutes: number) {
    const start = parseTimeToMinutes(startTime);
    const end = parseTimeToMinutes(endTime);

    if (start === null || end === null) {
        return false;
    }

    if (end <= start) {
        return currentMinutes >= start || currentMinutes < end;
    }

    return currentMinutes >= start && currentMinutes < end;
}

function parseTimeToMinutes(value: string) {
    const match = value.match(/^(\d{1,2}):(\d{2})/);

    if (!match) {
        return null;
    }

    return Number(match[1]) * 60 + Number(match[2]);
}

function getVietnamNowParts() {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: VIETNAM_TIMEZONE,
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).formatToParts(new Date());
    const weekday = readDatePart(parts, "weekday").toLowerCase().slice(0, 3);
    const hour = Number(readDatePart(parts, "hour")) % 24;
    const minute = Number(readDatePart(parts, "minute"));

    return {
        dayKey: DAY_KEYS.find((day) => day === weekday) ?? "sun",
        minutes: hour * 60 + minute,
    };
}

function readDatePart(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes) {
    return parts.find((part) => part.type === type)?.value ?? "0";
}

function getVietnamDate() {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: VIETNAM_TIMEZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(new Date());
}
