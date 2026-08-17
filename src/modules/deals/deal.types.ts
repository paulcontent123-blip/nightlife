export interface CreateDealDTO {
    title: string;
    description?: string | null;
    discount_type?: string | null;
    discount_value?: number | null;
    applicable_days?: string[];
    start_time: string;
    end_time: string;
    conditions?: string | null;
    is_exclusive?: boolean;
    is_active?: boolean;
    valid_until?: string | null;
}

export interface UpdateDealDTO {
    title?: string;
    description?: string | null;
    discount_type?: string | null;
    discount_value?: number | null;
    applicable_days?: string[];
    start_time?: string;
    end_time?: string;
    conditions?: string | null;
    is_exclusive?: boolean;
    is_active?: boolean;
    valid_until?: string | null;
}

export interface DealListQuery {
    is_active?: boolean;
    is_exclusive?: boolean;
    day?: string;
    city?: "hcm" | "hanoi" | "danang";
    district?: string;
    active_now?: boolean;
    happy_hour_now?: boolean;
    is_open_now?: boolean;
    page: number;
    limit: number;
}

export interface DealRow {
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

export type DealRecord = Omit<DealRow, "id" | "created_at">;

export interface DealRowWithVenue extends DealRow {
    venues: {
        id: string;
        name: string;
        slug: string;
        city: string;
        district: string | null;
    };
}
