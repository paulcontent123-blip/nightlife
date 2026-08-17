import type { EventRow } from "./event.types";

export function mapEvent(row: EventRow) {
    return {
        id: row.id,
        slug: row.slug,
        venue_id: row.venue_id,
        title: row.title,
        description: row.description,
        event_date: row.event_date,
        start_time: row.start_time,
        end_time: row.end_time,
        genre: row.genre ?? [],
        lineup: row.lineup ?? [],
        media: {
            thumbnail_url: row.thumbnail_url,
            images: row.images ?? [],
        },
        is_free: row.is_free,
        age_restriction: row.age_restriction,
        total_capacity: row.total_capacity,
        is_active: row.is_active,
        created_at: row.created_at,
    };
}
