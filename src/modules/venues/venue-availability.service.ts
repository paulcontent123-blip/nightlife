import { redisJsonGet, redisJsonSet } from "@/lib/redis/server";
import { logBookingLifecycle } from "@/lib/logger/booking-lifecycle";
import { AuthException } from "@/modules/auth/auth.errors";
import { assertWithinPriorityBookingWindow } from "@/modules/membership/priority-booking";
import { VenueAvailabilityQuerySchema } from "./venue.validator";
import { VenueRepository } from "./venue.repository";
import { readVenueAvailabilityCacheVersion } from "./venue-cache";
import type {
    VenueAvailabilityQuery,
    VenueAvailabilityResult,
} from "./venue.types";

const CACHE_TTL_SECONDS = 300;
const DEFAULT_TIME_SLOTS = ["18:00", "19:00", "20:00", "21:00", "22:00", "23:00"];
const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

export class VenueAvailabilityService {
    constructor(private repository = new VenueRepository()) { }

    // Kiểm tra bàn còn trống theo ngày/số người và cache kết quả trong Redis 5 phút.
    async getVenueAvailability(
        slug: string,
        searchParams: URLSearchParams,
        perks: {
            priorityBookingHours?: number;
            guaranteedVipTable?: boolean;
            conciergeHotline?: string | null;
        } = {}
    ): Promise<VenueAvailabilityResult> {
        const query = VenueAvailabilityQuerySchema.parse(Object.fromEntries(searchParams));
        const priorityBookingHours = perks.priorityBookingHours ?? 0;
        const guaranteedVipTable = perks.guaranteedVipTable === true;
        const bookingWindow = assertWithinPriorityBookingWindow(query.date, priorityBookingHours);

        logBookingLifecycle("availability_check_requested", {
            venue_slug: slug,
            date: query.date,
            party_size: query.party_size,
            priority_booking_hours: priorityBookingHours,
            guaranteed_vip_table: guaranteedVipTable,
        });

        const venue = await this.repository.findBySlug(slug, true);

        if (!venue) {
            throw new AuthException(404, "VENUE_NOT_FOUND");
        }

        const cacheVersion = await readVenueAvailabilityCacheVersion(venue.id);
        const cacheKey = createAvailabilityCacheKey(
            venue.id,
            cacheVersion,
            slug,
            query,
            priorityBookingHours,
            guaranteedVipTable
        );
        const cachedResult = await readCache<VenueAvailabilityResult>(cacheKey);

        if (cachedResult) {
            logBookingLifecycle("availability_check_cache_hit", {
                venue_id: venue.id,
                venue_slug: slug,
                date: query.date,
                party_size: query.party_size,
                available_tables: cachedResult.tables.length,
                time_slots: cachedResult.time_slots.length,
            });

            return cachedResult;
        }

        logBookingLifecycle("availability_check_cache_miss", {
            venue_id: venue.id,
            venue_slug: slug,
            date: query.date,
            party_size: query.party_size,
        });

        // Hai truy vấn độc lập nên chạy song song để giảm thời gian cache miss.
        const [tables, bookings] = await Promise.all([
            this.repository.listEligibleTables(venue.id, query.party_size),
            this.repository.listBlockingBookings(venue.id, query),
        ]);
        const bookedTableIdsByTime = new Map<string, Set<string>>();
        const vipTableIds = new Set(
            tables
                .filter((table) => table.type.toLowerCase() === "vip")
                .map((table) => table.id)
        );

        for (const booking of bookings) {
            if (!booking.table_id) {
                continue;
            }

            const time = normalizeBookingTime(booking.booking_time);
            const bookedTableIds = bookedTableIdsByTime.get(time) ?? new Set<string>();

            bookedTableIds.add(booking.table_id);
            bookedTableIdsByTime.set(time, bookedTableIds);
        }

        const timeSlots = createAvailabilitySlots(venue.operations.open_hours, query.date).map((time) => {
            const bookedTableIds = bookedTableIdsByTime.get(time) ?? new Set<string>();
            const availableTableIds = tables
                .filter((table) => !bookedTableIds.has(table.id))
                .map((table) => table.id);

            return {
                time,
                available_table_count: availableTableIds.length,
                available_table_ids: availableTableIds,
            };
        });

        const result: VenueAvailabilityResult = {
            venue: {
                id: venue.id,
                slug: venue.slug,
                name: venue.name,
            },
            date: query.date,
            party_size: query.party_size,
            tables: tables.map((table) => ({
                id: table.id,
                table_name: table.table_name,
                type: table.type,
                capacity: table.capacity,
                min_spend: table.min_spend,
                deposit_required: table.deposit_required,
            })),
            time_slots: timeSlots,
            booking_window: bookingWindow,
            guaranteed_vip: createGuaranteedVipAvailability({
                eligible: guaranteedVipTable,
                hasAvailableVipTable: timeSlots.some((slot) =>
                    slot.available_table_ids.some((tableId) => vipTableIds.has(tableId))
                ),
                conciergeHotline: perks.conciergeHotline ?? null,
            }),
            cache: {
                ttl: CACHE_TTL_SECONDS,
            },
        };

        await writeCache(cacheKey, result);
        logBookingLifecycle("availability_check_completed", {
            venue_id: venue.id,
            venue_slug: slug,
            date: query.date,
            party_size: query.party_size,
            eligible_tables: tables.length,
            blocking_bookings: bookings.length,
            time_slots: result.time_slots.length,
        });

        return result;
    }
}

function createAvailabilityCacheKey(
    venueId: string,
    version: number,
    slug: string,
    query: VenueAvailabilityQuery,
    priorityBookingHours: number,
    guaranteedVipTable: boolean
) {
    return `cache:venues:availability:${venueId}:v${version}:${slug}:${query.date}:${query.party_size}:priority:${priorityBookingHours}:guaranteed:${guaranteedVipTable}`;
}

async function readCache<T>(key: string): Promise<T | null> {
    try {
        return await redisJsonGet<T>(key);
    } catch {
        return null;
    }
}

async function writeCache<T>(key: string, value: T): Promise<void> {
    try {
        await redisJsonSet(key, value, CACHE_TTL_SECONDS);
    } catch {
        // Cache failures do not block the public availability response.
    }
}

function createAvailabilitySlots(
    openHours: Record<string, string> | null | undefined,
    date: string
) {
    const dayKey = DAY_KEYS[readDateInVietnamTimezone(date).getDay()];
    const schedule = openHours?.[dayKey];

    if (!schedule) {
        return DEFAULT_TIME_SLOTS;
    }

    if (["closed", "off"].includes(schedule.trim().toLowerCase())) {
        return [];
    }

    const range = schedule.match(/^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/);

    if (!range) {
        return DEFAULT_TIME_SLOTS;
    }

    const start = Number(range[1]) * 60 + Number(range[2]);
    let end = Number(range[3]) * 60 + Number(range[4]);

    if (end <= start) {
        end += 24 * 60;
    }

    const slots: string[] = [];

    for (let minute = start; minute < end; minute += 60) {
        slots.push(formatTimeSlot(minute));
    }

    return slots;
}

function normalizeBookingTime(value: string) {
    const match = value.match(/^(\d{1,2}):(\d{2})/);

    if (!match) {
        return value;
    }

    return `${match[1].padStart(2, "0")}:${match[2]}`;
}

function formatTimeSlot(totalMinutes: number) {
    const minutesInDay = 24 * 60;
    const normalizedMinutes = ((totalMinutes % minutesInDay) + minutesInDay) % minutesInDay;
    const hours = Math.floor(normalizedMinutes / 60).toString().padStart(2, "0");
    const minutes = (normalizedMinutes % 60).toString().padStart(2, "0");

    return `${hours}:${minutes}`;
}

function readDateInVietnamTimezone(date: string) {
    return new Date(`${date}T00:00:00+07:00`);
}

function createGuaranteedVipAvailability(input: {
    eligible: boolean;
    hasAvailableVipTable: boolean;
    conciergeHotline: string | null;
}) {
    if (!input.eligible) {
        return {
            eligible: false,
            available: false,
            action: "none" as const,
            concierge_hotline: null,
            message: null,
        };
    }

    if (input.hasAvailableVipTable) {
        return {
            eligible: true,
            available: true,
            action: "none" as const,
            concierge_hotline: input.conciergeHotline,
            message: "VIP table options are available for this request.",
        };
    }

    return {
        eligible: true,
        available: false,
        action: "contact_concierge" as const,
        concierge_hotline: input.conciergeHotline,
        message: "No VIP table is currently available. Contact concierge so operations can offer an alternative.",
    };
}
