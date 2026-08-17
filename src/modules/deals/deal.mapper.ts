import type { DealRow, DealRowWithVenue } from "./deal.types";

export function mapDeal(row: DealRow) {
    return {
        id: row.id,
        venue_id: row.venue_id,
        title: row.title,
        description: row.description,
        discount_type: row.discount_type,
        discount_value: row.discount_value,
        applicable_days: row.applicable_days ?? [],
        start_time: row.start_time,
        end_time: row.end_time,
        conditions: row.conditions,
        is_exclusive: row.is_exclusive,
        is_active: row.is_active,
        valid_until: row.valid_until,
        created_at: row.created_at,
    };
}

export function mapPublicDeal(row: DealRowWithVenue) {
    return {
        ...mapDeal(row),
        venue: {
            id: row.venues.id,
            name: row.venues.name,
            slug: row.venues.slug,
            city: row.venues.city,
            district: row.venues.district,
        },
    };
}
