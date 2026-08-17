import { createAdminClient } from "@/lib/supabase/admin";
import { AuthException } from "@/modules/auth/auth.errors";
import { mapBooking } from "./booking.mapper";
import type {
    AdminBookingListQuery,
    BookingListQuery,
    BookingRecord,
    BookingRow,
    BookingStatus,
    BookingUpdateRecord,
} from "./booking.types";

const BOOKINGS_TABLE = "bookings";
const VENUE_TABLES_TABLE = "venue_tables";
const VENUES_TABLE = "venues";
const BLOCKING_BOOKING_STATUSES: BookingStatus[] = ["pending", "confirmed", "seated"];
const VIETNAM_TIMEZONE_OFFSET = "+07:00";

export class BookingRepository {
    private get supabase() {
        return createAdminClient();
    }

    async create(input: BookingRecord) {
        const { data, error } = await this.supabase
            .from(BOOKINGS_TABLE)
            .insert(input)
            .select("*")
            .single<BookingRow>();

        if (error) {
            if (isActiveTableSlotConflict(error)) {
                throw new AuthException(409, "BOOKING_CONFLICT");
            }

            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return mapBooking(data);
    }

    async listMine(userId: string, query: BookingListQuery) {
        const from = (query.page - 1) * query.limit;
        const to = from + query.limit - 1;
        let request = this.supabase
            .from(BOOKINGS_TABLE)
            .select("*", { count: "exact" })
            .eq("user_id", userId);

        if (query.status) {
            request = request.eq("status", query.status);
        }

        const { data, error, count } = await request
            .order("booking_date", { ascending: false })
            .order("booking_time", { ascending: false })
            .range(from, to)
            .returns<BookingRow[]>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        const total = count ?? 0;

        return {
            items: (data ?? []).map(mapBooking),
            pagination: {
                page: query.page,
                limit: query.limit,
                total,
                total_pages: Math.ceil(total / query.limit),
            },
        };
    }

    async listAdmin(query: AdminBookingListQuery) {
        const from = (query.page - 1) * query.limit;
        const to = from + query.limit - 1;
        let request = this.supabase
            .from(BOOKINGS_TABLE)
            .select("*", { count: "exact" });

        if (query.status) {
            request = request.eq("status", query.status);
        }

        if (query.venue_id) {
            request = request.eq("venue_id", query.venue_id);
        }

        if (query.booking_date) {
            request = request.eq("booking_date", query.booking_date);
        }

        const { data, error, count } = await request
            .order("booking_date", { ascending: false })
            .order("booking_time", { ascending: false })
            .range(from, to)
            .returns<BookingRow[]>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        const total = count ?? 0;

        return {
            items: (data ?? []).map(mapBooking),
            pagination: {
                page: query.page,
                limit: query.limit,
                total,
                total_pages: Math.ceil(total / query.limit),
            },
        };
    }

    async findById(id: string) {
        const { data, error } = await this.supabase
            .from(BOOKINGS_TABLE)
            .select("*")
            .eq("id", id)
            .maybeSingle<BookingRow>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return data ? mapBooking(data) : null;
    }

    async findByPaymentRef(paymentRef: string) {
        const { data, error } = await this.supabase
            .from(BOOKINGS_TABLE)
            .select("*")
            .eq("payment_ref", paymentRef)
            .maybeSingle<BookingRow>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return data ? mapBooking(data) : null;
    }

    async findTableForVenue(venueId: string, tableId: string) {
        const { data, error } = await this.supabase
            .from(VENUE_TABLES_TABLE)
            .select("id, venue_id, table_name, type, capacity, min_spend, deposit_required, is_active")
            .eq("venue_id", venueId)
            .eq("id", tableId)
            .maybeSingle<{
                id: string;
                venue_id: string;
                table_name: string;
                type: string;
                capacity: number;
                min_spend: number | null;
                deposit_required: number;
                is_active: boolean;
            }>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return data;
    }

    async hasBlockingBooking(input: {
        venueId: string;
        tableId: string;
        bookingDate: string;
        bookingTime: string;
        excludeBookingId?: string;
    }) {
        let request = this.supabase
            .from(BOOKINGS_TABLE)
            .select("id")
            .eq("venue_id", input.venueId)
            .eq("table_id", input.tableId)
            .eq("booking_date", input.bookingDate)
            .eq("booking_time", input.bookingTime)
            .in("status", BLOCKING_BOOKING_STATUSES);

        if (input.excludeBookingId) {
            request = request.neq("id", input.excludeBookingId);
        }

        const { data, error } = await request.limit(1).maybeSingle<{ id: string }>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return Boolean(data);
    }

    async update(id: string, input: BookingUpdateRecord) {
        const { data, error } = await this.supabase
            .from(BOOKINGS_TABLE)
            .update(input)
            .eq("id", id)
            .select("*")
            .single<BookingRow>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return mapBooking(data);
    }

    async listConfirmedBookingsNeedingReminder(input: {
        windowStart: Date;
        windowEnd: Date;
        limit: number;
    }) {
        const startDate = formatVietnamDate(input.windowStart);
        const endDate = formatVietnamDate(input.windowEnd);
        const { data, error } = await this.supabase
            .from(BOOKINGS_TABLE)
            .select("*")
            .eq("status", "confirmed")
            .is("reminder_push_sent_at", null)
            .gte("booking_date", startDate)
            .lte("booking_date", endDate)
            .order("booking_date", { ascending: true })
            .order("booking_time", { ascending: true })
            .limit(input.limit)
            .returns<BookingRow[]>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return (data ?? [])
            .filter((row) => {
                const bookingAt = createBookingDateTime(row.booking_date, row.booking_time);

                return bookingAt >= input.windowStart && bookingAt <= input.windowEnd;
            })
            .map(mapBooking);
    }

    async refreshVenueBookingSummary(venueId: string) {
        const { count, error } = await this.supabase
            .from(BOOKINGS_TABLE)
            .select("id", { count: "exact", head: true })
            .eq("venue_id", venueId)
            .not("status", "in", "(cancelled,no_show)");

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        const { error: updateError } = await this.supabase
            .from(VENUES_TABLE)
            .update({
                total_bookings: count ?? 0,
            })
            .eq("id", venueId);

        if (updateError) {
            throw new AuthException(500, "DATABASE_ERROR", updateError.message);
        }
    }
}

function createBookingDateTime(bookingDate: string, bookingTime: string) {
    return new Date(`${bookingDate}T${normalizeTime(bookingTime)}:00${VIETNAM_TIMEZONE_OFFSET}`);
}

function normalizeTime(value: string) {
    const match = value.match(/^(\d{2}:\d{2})/);

    return match?.[1] ?? value;
}

function formatVietnamDate(date: Date) {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Ho_Chi_Minh",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(date);
}

function isActiveTableSlotConflict(error: unknown) {
    if (!error || typeof error !== "object") {
        return false;
    }

    const record = error as { code?: unknown; message?: unknown };
    const message = typeof record.message === "string" ? record.message : "";

    return record.code === "23505" && message.includes("bookings_unique_active_table_slot");
}
