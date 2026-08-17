import { createAdminClient } from "@/lib/supabase/admin";
import { AuthException } from "@/modules/auth/auth.errors";
import { mapVenueReview } from "./venue-review.mapper";
import type {
    BookingVerificationRow,
    EligibleReviewBooking,
    VenueReviewListQuery,
    VenueReviewRecord,
    VenueReviewRow,
} from "./venue-review.types";

const VENUE_REVIEWS_TABLE = "venue_reviews";
const BOOKINGS_TABLE = "bookings";
const VENUES_TABLE = "venues";
const VERIFIED_BOOKING_STATUSES = ["confirmed", "seated", "completed"];

export class VenueReviewRepository {
    private get supabase() {
        return createAdminClient();
    }

    async listByVenue(venueId: string, query: VenueReviewListQuery) {
        const from = (query.page - 1) * query.limit;
        const to = from + query.limit - 1;
        let request = this.supabase
            .from(VENUE_REVIEWS_TABLE)
            .select("*", { count: "exact" })
            .eq("venue_id", venueId);

        request = query.sort === "rating"
            ? request.order("rating", { ascending: false }).order("created_at", { ascending: false })
            : request.order("created_at", { ascending: false });

        const { data, error, count } = await request
            .range(from, to)
            .returns<VenueReviewRow[]>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        const total = count ?? 0;

        return {
            items: (data ?? []).map(mapVenueReview),
            pagination: {
                page: query.page,
                limit: query.limit,
                total,
                total_pages: Math.ceil(total / query.limit),
            },
        };
    }

    async findVerifiedBooking(bookingId: string, venueId: string, userId: string) {
        const { data, error } = await this.supabase
            .from(BOOKINGS_TABLE)
            .select("id, venue_id, user_id, booking_date, status")
            .eq("id", bookingId)
            .eq("venue_id", venueId)
            .eq("user_id", userId)
            .in("status", VERIFIED_BOOKING_STATUSES)
            .maybeSingle<BookingVerificationRow>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return data;
    }

    async listEligibleBookingsForReview(venueId: string, userId: string): Promise<EligibleReviewBooking[]> {
        const { data, error } = await this.supabase
            .from(BOOKINGS_TABLE)
            .select("id, booking_date, booking_time")
            .eq("venue_id", venueId)
            .eq("user_id", userId)
            .in("status", VERIFIED_BOOKING_STATUSES)
            .order("booking_date", { ascending: false })
            .returns<EligibleReviewBooking[]>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        const bookings = data ?? [];

        if (bookings.length === 0) {
            return [];
        }

        const { data: reviewed, error: reviewedError } = await this.supabase
            .from(VENUE_REVIEWS_TABLE)
            .select("booking_id")
            .in("booking_id", bookings.map((booking) => booking.id))
            .returns<Array<{ booking_id: string | null }>>();

        if (reviewedError) {
            throw new AuthException(500, "DATABASE_ERROR", reviewedError.message);
        }

        const reviewedBookingIds = new Set((reviewed ?? []).map((row) => row.booking_id));

        return bookings.filter((booking) => !reviewedBookingIds.has(booking.id));
    }

    async reviewExistsForBooking(bookingId: string) {
        const { data, error } = await this.supabase
            .from(VENUE_REVIEWS_TABLE)
            .select("id")
            .eq("booking_id", bookingId)
            .maybeSingle<{ id: string }>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return Boolean(data);
    }

    async create(input: VenueReviewRecord) {
        const { data, error } = await this.supabase
            .from(VENUE_REVIEWS_TABLE)
            .insert(input)
            .select("*")
            .single<VenueReviewRow>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return mapVenueReview(data);
    }

    async refreshVenueRatingSummary(venueId: string) {
        const { data, error } = await this.supabase
            .from(VENUE_REVIEWS_TABLE)
            .select("rating")
            .eq("venue_id", venueId)
            .returns<Array<{ rating: number }>>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        const ratings = data ?? [];
        const totalReviews = ratings.length;
        const avgRating = totalReviews > 0
            ? Number((ratings.reduce((sum, review) => sum + review.rating, 0) / totalReviews).toFixed(2))
            : null;
        const { error: updateError } = await this.supabase
            .from(VENUES_TABLE)
            .update({
                avg_rating: avgRating,
                total_reviews: totalReviews,
            })
            .eq("id", venueId);

        if (updateError) {
            throw new AuthException(500, "DATABASE_ERROR", updateError.message);
        }
    }
}
