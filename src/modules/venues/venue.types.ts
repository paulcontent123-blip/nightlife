export type VenueType =
    | "rooftop_bar"
    | "club"
    | "wine_bar"
    | "live_music"
    | "terrace"
    | "lounge";

export type VenuePriceRange = "$" | "$$" | "$$$" | "$$$$";

export type VenueCity = "hcm" | "hanoi" | "danang";

export type VenueSubscriptionTier = "basic" | "premium";

export interface CreateVenueDTO {
    basic: {
        name: string;
        slug?: string;
        type: VenueType;
        description?: string;
        phone?: string;
        website?: string;
        instagram?: string;
    };
    address?: {
        google_place_id?: string;
        address?: string;
        district?: string;
        city?: VenueCity;
        lat?: number;
        lng?: number;
        marker_lat?: number;
        marker_lng?: number;
    };
    pricing?: {
        cover_charge?: number;
        price_range?: VenuePriceRange;
        capacity?: number;
        min_spend?: number;
        dress_code?: string;
        age_restriction?: number;
    };
    operations?: {
        open_hours?: Record<string, string>;
        is_vip_only?: boolean;
        subscription_tier?: VenueSubscriptionTier;
    };
    media?: {
        thumbnail_url?: string;
        images?: string[];
    };
    features?: string[];
}

export interface UpdateVenueDTO {
    basic?: Partial<CreateVenueDTO["basic"]>;
    address?: CreateVenueDTO["address"];
    pricing?: Partial<NonNullable<CreateVenueDTO["pricing"]>>;
    operations?: Partial<NonNullable<CreateVenueDTO["operations"]>> & {
        is_active?: boolean;
        is_verified?: boolean;
    };
    media?: Partial<NonNullable<CreateVenueDTO["media"]>>;
    features?: string[];
}

export interface VenueListQuery {
    city?: VenueCity;
    type?: VenueType;
    district?: string;
    price_range?: VenuePriceRange;
    features?: string[];
    is_active?: boolean;
    is_open_now?: boolean;
    sort?: "rating" | "popular" | "newest";
    page: number;
    limit: number;
}

export interface VenueListResult<T> {
    items: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        total_pages: number;
    };
}

export interface VenueAvailabilityQuery {
    date: string;
    party_size: number;
}

export interface VenueNearbyQuery {
    lat: number;
    lng: number;
    radius: number;
    page: number;
    limit: number;
}

export interface VenueNearbyResult<T> {
    items: Array<T & {
        distance: {
            meters: number;
            kilometers: number;
        };
    }>;
    pagination: {
        page: number;
        limit: number;
        total: number;
        total_pages: number;
    };
    search: {
        lat: number;
        lng: number;
        radius: number;
    };
}

export interface VenueTableRow {
    id: string;
    venue_id: string;
    table_name: string;
    type: string;
    capacity: number;
    min_spend: number | null;
    deposit_required: number;
    is_active: boolean;
}

export interface VenueBookingRow {
    table_id: string | null;
    booking_time: string;
}

export interface VenueAvailabilityResult {
    venue: {
        id: string;
        slug: string;
        name: string;
    };
    date: string;
    party_size: number;
    tables: Array<{
        id: string;
        table_name: string;
        type: string;
        capacity: number;
        min_spend: number | null;
        deposit_required: number;
    }>;
    time_slots: Array<{
        time: string;
        available_table_count: number;
        available_table_ids: string[];
    }>;
    booking_window: {
        free_advance_days: number;
        priority_booking_hours: number;
        max_advance_hours: number;
        max_booking_date: string;
    };
    guaranteed_vip: {
        eligible: boolean;
        available: boolean;
        action: "none" | "contact_concierge";
        concierge_hotline: string | null;
        message: string | null;
    };
    cache: {
        ttl: number;
    };
}

export interface VenueDealRow {
    id: string;
    venue_id: string;
    title: string;
    description: string | null;
    discount_type: string | null;
    discount_value: number | null;
    applicable_days: string[] | null;
    start_time: string;
    end_time: string;
    conditions: string | null;
    is_exclusive: boolean;
    is_active: boolean;
    valid_until: string | null;
    created_at: string;
}

export interface VenueReviewRow {
    id: string;
    venue_id: string;
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

export interface VenueRow {
    id: string;
    slug: string;
    owner_id: string | null;
    name: string;
    type: VenueType;
    description: string | null;
    address: string;
    district: string | null;
    city: string;
    lat: number | null;
    lng: number | null;
    phone: string | null;
    website: string | null;
    instagram: string | null;
    cover_charge: number;
    price_range: VenuePriceRange;
    capacity: number | null;
    min_spend: number | null;
    dress_code: string | null;
    age_restriction: number;
    open_hours: Record<string, string> | null;
    features: string[] | null;
    thumbnail_url: string | null;
    images: string[] | null;
    is_verified: boolean;
    is_active: boolean;
    is_vip_only: boolean;
    avg_rating: number | null;
    total_reviews: number;
    total_bookings: number;
    subscription_tier: VenueSubscriptionTier;
    created_at: string;
}

export type VenueListRow = Pick<
    VenueRow,
    | "id"
    | "slug"
    | "name"
    | "type"
    | "district"
    | "city"
    | "cover_charge"
    | "price_range"
    | "features"
    | "thumbnail_url"
    | "is_verified"
    | "is_active"
    | "avg_rating"
    | "total_reviews"
    | "total_bookings"
    | "open_hours"
    | "created_at"
>;

export interface VenueAddressPayload {
    address: string;
    district: string | null;
    city: VenueCity;
    lat: number;
    lng: number;
}
