import type { VenueCity, VenuePriceRange, VenueType } from "@/modules/venues/venue.types";

export interface BarTourRecommendationQuery {
    keyword?: string;
    city?: VenueCity;
    district?: string;
    price_range?: VenuePriceRange;
    party_size?: number;
    limit: number;
}

export interface BarTourRecommendationDTO {
    keyword?: string;
    city?: VenueCity;
    district?: string;
    price_range?: VenuePriceRange;
    party_size?: number;
    limit?: number;
}

export interface BarTourRecommendationResult {
    query: {
        keyword: string | null;
        city: VenueCity | null;
        district: string | null;
        price_range: VenuePriceRange | null;
        party_size: number | null;
        limit: number;
    };
    itinerary: Array<{
        step: string;
        title: string;
        suggestions: Array<BarTourVenueSuggestion | FoodSuggestion>;
    }>;
    suggestions: {
        bars: BarTourVenueSuggestion[];
        food: FoodSuggestion[];
    };
    metadata: {
        mode: string;
        data_sources: Record<string, string>;
        note: string;
    };
}

// Bar Tour scoring only needs these columns; the venue detail fields and
// gallery are intentionally excluded from recommendation queries.
export interface BarTourVenueRow {
    id: string;
    slug: string;
    name: string;
    type: VenueType;
    description: string | null;
    district: string | null;
    city: VenueCity;
    price_range: VenuePriceRange;
    capacity: number | null;
    features: string[] | null;
    thumbnail_url: string | null;
    avg_rating: number | null;
    total_reviews: number;
    total_bookings: number;
}

export interface BarTourDealRow {
    id: string;
    venue_id: string;
    title: string;
    discount_type: string | null;
    discount_value: number | null;
    start_time: string;
    end_time: string;
    is_exclusive: boolean;
}

export interface BarTourEventRow {
    id: string;
    venue_id: string;
    slug: string;
    title: string;
    event_date: string;
    start_time: string;
    genre: string[] | null;
}

export interface BarTourVenueSuggestion {
    id: string;
    slug: string;
    name: string;
    type: string;
    district: string | null;
    city: string;
    price_range: string;
    rating: number | null;
    total_reviews: number;
    total_bookings: number;
    features: string[];
    media: {
        thumbnail_url: string | null;
    };
    score: number;
    reason: string;
    matched_keywords: string[];
    deals: Array<{
        id: string;
        title: string;
        discount_type: string | null;
        discount_value: number | null;
        start_time: string;
        end_time: string;
        is_exclusive: boolean;
    }>;
    events: Array<{
        id: string;
        slug: string;
        title: string;
        event_date: string;
        start_time: string;
        genre: string[];
    }>;
}

export interface FoodSuggestion {
    title: string;
    area: string;
    keywords: string[];
    reason: string;
    timing: "before_bar" | "late_night" | "group_dining";
    data_source: "heuristic";
}
