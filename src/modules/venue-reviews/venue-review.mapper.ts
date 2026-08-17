import type { VenueReviewRow } from "./venue-review.types";

export function mapVenueReview(row: VenueReviewRow) {
    return {
        id: row.id,
        venue_id: row.venue_id,
        rating: row.rating,
        atmosphere_rating: row.atmosphere_rating,
        service_rating: row.service_rating,
        value_rating: row.value_rating,
        content: row.content,
        visited_date: row.visited_date,
        images: row.images ?? [],
        is_verified_visit: row.is_verified_visit,
        helpful_count: row.helpful_count,
        created_at: row.created_at,
    };
}
