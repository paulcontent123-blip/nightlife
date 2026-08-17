import type { VenueCity, VenuePriceRange } from "@/modules/venues/venue.types";

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
