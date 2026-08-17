import { createAdminClient } from "@/lib/supabase/admin";
import { AuthException } from "@/modules/auth/auth.errors";
import { mapVenue } from "./venue.mapper";
import type {
    VenueAvailabilityQuery,
    VenueBookingRow,
    VenueDealRow,
    VenueListQuery,
    VenueNearbyQuery,
    VenueReviewRow,
    VenueTableRow,
    VenueRow,
} from "./venue.types";

const VENUES_TABLE = "venues";
const VENUE_TABLES_TABLE = "venue_tables";
const BOOKINGS_TABLE = "bookings";
const DEALS_TABLE = "deals";
const VENUE_REVIEWS_TABLE = "venue_reviews";
const BLOCKING_BOOKING_STATUSES = ["pending", "confirmed", "seated"];
const OPEN_NOW_FILTER_FETCH_LIMIT = 5000;
const VIETNAM_TIMEZONE = "Asia/Ho_Chi_Minh";
const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

type DayKey = typeof DAY_KEYS[number];

type CreateVenueRecord = Omit<
    VenueRow,
    | "id"
    | "avg_rating"
    | "total_reviews"
    | "total_bookings"
    | "created_at"
>;

type UpdateVenueRecord = Partial<CreateVenueRecord>;

export class VenueRepository {
    private get supabase() {
        return createAdminClient();
    }

    async createVenue(input: CreateVenueRecord) {
        const { data, error } = await this.supabase
            .from(VENUES_TABLE)
            .insert(input)
            .select("*")
            .single<VenueRow>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return mapVenue(data);
    }

    async listVenues(query: VenueListQuery, publicOnly = true) {
        const from = (query.page - 1) * query.limit;
        const to = from + query.limit - 1;
        const shouldFilterOpenNow = query.is_open_now === true;
        let request = this.supabase
            .from(VENUES_TABLE)
            .select("*", { count: "exact" });

        if (publicOnly) {
            request = request.eq("is_active", true);
        } else if (query.is_active !== undefined) {
            request = request.eq("is_active", query.is_active);
        }

        if (query.city) {
            request = request.eq("city", query.city);
        }

        if (query.type) {
            request = request.eq("type", query.type);
        }

        if (query.district) {
            request = request.eq("district", query.district);
        }

        if (query.price_range) {
            request = request.eq("price_range", query.price_range);
        }

        if (query.features?.length) {
            request = request.contains("features", query.features);
        }

        if (query.sort === "rating") {
            request = request.order("avg_rating", { ascending: false, nullsFirst: false });
        } else if (query.sort === "popular") {
            request = request
                .order("total_bookings", { ascending: false })
                .order("total_reviews", { ascending: false });
        } else {
            request = request.order("created_at", { ascending: false });
        }

        request = shouldFilterOpenNow
            ? request.range(0, OPEN_NOW_FILTER_FETCH_LIMIT - 1)
            : request.range(from, to);

        const { data, error, count } = await request.returns<VenueRow[]>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        const filteredRows = shouldFilterOpenNow
            ? (data ?? []).filter((venue) => isVenueOpenNow(venue.open_hours))
            : data ?? [];
        const rows = shouldFilterOpenNow
            ? filteredRows.slice(from, to + 1)
            : filteredRows;
        const total = shouldFilterOpenNow ? filteredRows.length : count ?? 0;

        return {
            items: rows.map(mapVenue),
            pagination: {
                page: query.page,
                limit: query.limit,
                total,
                total_pages: Math.ceil(total / query.limit),
            },
        };
    }

    async listNearbyCandidates(query: VenueNearbyQuery): Promise<VenueRow[]> {
        const bounds = createCoordinateBounds(query);
        const { data, error } = await this.supabase
            .from(VENUES_TABLE)
            .select("*")
            .eq("is_active", true)
            .not("lat", "is", null)
            .not("lng", "is", null)
            .gte("lat", bounds.minLat)
            .lte("lat", bounds.maxLat)
            .gte("lng", bounds.minLng)
            .lte("lng", bounds.maxLng)
            .limit(OPEN_NOW_FILTER_FETCH_LIMIT)
            .returns<VenueRow[]>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return data ?? [];
    }

    async findBySlug(slug: string, publicOnly = true) {
        let request = this.supabase
            .from(VENUES_TABLE)
            .select("*")
            .eq("slug", slug);

        if (publicOnly) {
            request = request.eq("is_active", true);
        }

        const { data, error } = await request.maybeSingle<VenueRow>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return data ? mapVenue(data) : null;
    }

    async findById(id: string) {
        const { data, error } = await this.supabase
            .from(VENUES_TABLE)
            .select("*")
            .eq("id", id)
            .maybeSingle<VenueRow>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return data ? mapVenue(data) : null;
    }

    async updateVenue(id: string, input: UpdateVenueRecord) {
        const { data, error } = await this.supabase
            .from(VENUES_TABLE)
            .update(input)
            .eq("id", id)
            .select("*")
            .single<VenueRow>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return mapVenue(data);
    }

    async softDeleteVenue(id: string) {
        return this.updateVenue(id, {
            is_active: false,
        });
    }

    async listEligibleTables(venueId: string, partySize: number): Promise<VenueTableRow[]> {
        const { data, error } = await this.supabase
            .from(VENUE_TABLES_TABLE)
            .select("*")
            .eq("venue_id", venueId)
            .eq("is_active", true)
            .gte("capacity", partySize)
            .order("capacity", { ascending: true })
            .returns<VenueTableRow[]>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return data ?? [];
    }

    async listActiveTables(venueId: string): Promise<VenueTableRow[]> {
        const { data, error } = await this.supabase
            .from(VENUE_TABLES_TABLE)
            .select("*")
            .eq("venue_id", venueId)
            .eq("is_active", true)
            .order("capacity", { ascending: true })
            .order("table_name", { ascending: true })
            .returns<VenueTableRow[]>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return data ?? [];
    }

    async listActiveDeals(venueId: string, includeExclusiveDeals = false): Promise<VenueDealRow[]> {
        const today = getVietnamDate();
        let request = this.supabase
            .from(DEALS_TABLE)
            .select("*")
            .eq("venue_id", venueId)
            .eq("is_active", true)
            .or(`valid_until.is.null,valid_until.gte.${today}`);

        if (!includeExclusiveDeals) {
            request = request.eq("is_exclusive", false);
        }

        const { data, error } = await request
            .order("created_at", { ascending: false })
            .returns<VenueDealRow[]>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return (data ?? []).filter(isDealActiveToday);
    }

    async listRecentReviews(venueId: string, limit = 20): Promise<VenueReviewRow[]> {
        const { data, error } = await this.supabase
            .from(VENUE_REVIEWS_TABLE)
            .select(
                [
                    "id",
                    "venue_id",
                    "rating",
                    "atmosphere_rating",
                    "service_rating",
                    "value_rating",
                    "content",
                    "visited_date",
                    "images",
                    "is_verified_visit",
                    "helpful_count",
                    "created_at",
                ].join(",")
            )
            .eq("venue_id", venueId)
            .order("created_at", { ascending: false })
            .limit(limit)
            .returns<VenueReviewRow[]>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return data ?? [];
    }

    async listBlockingBookings(
        venueId: string,
        query: VenueAvailabilityQuery
    ): Promise<VenueBookingRow[]> {
        const { data, error } = await this.supabase
            .from(BOOKINGS_TABLE)
            .select("table_id, booking_time")
            .eq("venue_id", venueId)
            .eq("booking_date", query.date)
            .in("status", BLOCKING_BOOKING_STATUSES)
            .returns<VenueBookingRow[]>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return data ?? [];
    }

    async slugExists(slug: string) {
        const { data, error } = await this.supabase
            .from(VENUES_TABLE)
            .select("id")
            .eq("slug", slug)
            .maybeSingle<{ id: string }>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return Boolean(data);
    }

}

function createCoordinateBounds(query: VenueNearbyQuery) {
    const latitudeDelta = query.radius / 111_320;
    const lngFactor = Math.cos(toRadians(query.lat));
    const longitudeDelta = query.radius / (111_320 * Math.max(Math.abs(lngFactor), 0.01));

    return {
        minLat: Math.max(-90, query.lat - latitudeDelta),
        maxLat: Math.min(90, query.lat + latitudeDelta),
        minLng: Math.max(-180, query.lng - longitudeDelta),
        maxLng: Math.min(180, query.lng + longitudeDelta),
    };
}

function toRadians(value: number) {
    return value * Math.PI / 180;
}

function isVenueOpenNow(openHours: Record<string, string> | null): boolean {
    if (!openHours) {
        return false;
    }

    const { dayKey, previousDayKey, minutes } = getVietnamNowParts();
    const todaySchedule = openHours[dayKey];
    const previousDaySchedule = openHours[previousDayKey];

    return (
        isWithinSchedule(todaySchedule, minutes, false) ||
        isWithinSchedule(previousDaySchedule, minutes, true)
    );
}

function getVietnamNowParts() {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: VIETNAM_TIMEZONE,
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).formatToParts(new Date());
    const weekday = readDatePart(parts, "weekday").toLowerCase().slice(0, 3) as DayKey;
    const hour = Number(readDatePart(parts, "hour")) % 24;
    const minute = Number(readDatePart(parts, "minute"));
    const dayIndex = DAY_KEYS.indexOf(weekday);
    const safeDayIndex = dayIndex >= 0 ? dayIndex : 0;

    return {
        dayKey: DAY_KEYS[safeDayIndex],
        previousDayKey: DAY_KEYS[(safeDayIndex + DAY_KEYS.length - 1) % DAY_KEYS.length],
        minutes: hour * 60 + minute,
    };
}

function readDatePart(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes) {
    return parts.find((part) => part.type === type)?.value ?? "0";
}

function isWithinSchedule(
    schedule: string | undefined,
    currentMinutes: number,
    previousDayOnly: boolean
) {
    const range = parseOpenHours(schedule);

    if (!range) {
        return false;
    }

    const isOvernight = range.end <= range.start;

    if (previousDayOnly) {
        return isOvernight && currentMinutes < range.end;
    }

    if (isOvernight) {
        return currentMinutes >= range.start;
    }

    return currentMinutes >= range.start && currentMinutes < range.end;
}

function parseOpenHours(schedule: string | undefined) {
    if (!schedule) {
        return null;
    }

    const normalizedSchedule = schedule.trim().toLowerCase();

    if (["closed", "off"].includes(normalizedSchedule)) {
        return null;
    }

    const range = normalizedSchedule.match(/^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/);

    if (!range) {
        return null;
    }

    return {
        start: Number(range[1]) * 60 + Number(range[2]),
        end: Number(range[3]) * 60 + Number(range[4]),
    };
}

function getVietnamDate() {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: VIETNAM_TIMEZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(new Date());
}

function isDealActiveToday(deal: VenueDealRow) {
    if (!deal.is_active) {
        return false;
    }

    if (deal.valid_until && deal.valid_until < getVietnamDate()) {
        return false;
    }

    const applicableDays = deal.applicable_days ?? [];

    if (applicableDays.length === 0) {
        return true;
    }

    return applicableDays.includes(getVietnamNowParts().dayKey);
}
