export interface CreateEventDTO {
    slug?: string;
    title: string;
    description?: string | null;
    event_date: string;
    start_time: string;
    end_time?: string | null;
    genre?: string[];
    lineup?: string[];
    thumbnail_url?: string | null;
    images?: string[];
    is_free?: boolean;
    age_restriction?: number;
    total_capacity?: number | null;
    is_active?: boolean;
}

export interface UpdateEventDTO {
    slug?: string;
    title?: string;
    description?: string | null;
    event_date?: string;
    start_time?: string;
    end_time?: string | null;
    genre?: string[];
    lineup?: string[];
    thumbnail_url?: string | null;
    images?: string[];
    is_free?: boolean;
    age_restriction?: number;
    total_capacity?: number | null;
    is_active?: boolean;
}

export interface EventListQuery {
    is_active?: boolean;
    date_from?: string;
    date_to?: string;
    genre?: string;
    page: number;
    limit: number;
}

export interface EventRow {
    id: string;
    slug: string;
    venue_id: string;
    title: string;
    description: string | null;
    event_date: string;
    start_time: string;
    end_time: string | null;
    genre: string[] | null;
    lineup: string[] | null;
    thumbnail_url: string | null;
    images: string[] | null;
    is_free: boolean;
    age_restriction: number;
    total_capacity: number | null;
    is_active: boolean;
    created_at: string;
}

export type EventRecord = Omit<EventRow, "id" | "created_at">;
