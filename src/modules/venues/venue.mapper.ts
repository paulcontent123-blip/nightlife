import type { VenueRow } from "./venue.types";

export function mapVenue(row: VenueRow) {
    return {
        id: row.id,
        slug: row.slug,
        name: row.name,
        type: row.type,
        description: row.description,
        address: row.address,
        district: row.district,
        city: row.city,
        location: {
            lat: row.lat,
            lng: row.lng,
        },
        contact: {
            phone: row.phone,
            website: row.website,
            instagram: row.instagram,
        },
        pricing: {
            cover_charge: row.cover_charge,
            price_range: row.price_range,
            capacity: row.capacity,
            min_spend: row.min_spend,
            dress_code: row.dress_code,
            age_restriction: row.age_restriction,
        },
        operations: {
            open_hours: row.open_hours,
            is_vip_only: row.is_vip_only,
            subscription_tier: row.subscription_tier,
        },
        features: row.features ?? [],
        media: {
            thumbnail_url: row.thumbnail_url,
            images: row.images ?? [],
        },
        status: {
            is_verified: row.is_verified,
            is_active: row.is_active,
        },
        metrics: {
            avg_rating: row.avg_rating,
            total_reviews: row.total_reviews,
            total_bookings: row.total_bookings,
        },
        created_at: row.created_at,
    };
}
