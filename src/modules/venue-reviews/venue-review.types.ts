export interface CreateVenueReviewDTO {
    booking_id: string;
    rating: number;
    atmosphere_rating?: number | null;
    service_rating?: number | null;
    value_rating?: number | null;
    content?: string | null;
    visited_date?: string | null;
    images?: string[];
}

export interface VenueReviewListQuery {
    page: number;
    limit: number;
    sort: "newest" | "rating";
}

export interface VenueReviewRow {
    id: string;
    venue_id: string;
    user_id: string;
    booking_id: string | null;
    rating: number;
    atmosphere_rating: number | null;
    service_rating: number | null;
    value_rating: number | null;
    content: string | null;
    visited_date: string | null;
    images: string[] | null;
    is_verified_visit: boolean;
    helpful_count: number;
    created_at: string;
}

export interface BookingVerificationRow {
    id: string;
    venue_id: string;
    user_id: string;
    booking_date: string;
    status: string;
}

export type VenueReviewRecord = Omit<VenueReviewRow, "id" | "created_at" | "helpful_count">;

export interface EligibleReviewBooking {
    id: string;
    booking_date: string;
    booking_time: string;
}
