export interface CreateTicketTierDTO {
    name: string;
    price: number;
    quantity: number;
    includes?: string[];
    sale_starts_at?: string | null;
    sale_ends_at?: string | null;
}

export type UpdateTicketTierDTO = Partial<CreateTicketTierDTO>;

export interface TicketTierRow {
    id: string;
    event_id: string;
    name: string;
    price: number;
    quantity: number;
    sold: number;
    includes: string[] | null;
    sale_starts_at: string | null;
    sale_ends_at: string | null;
}

export type TicketTierRecord = Omit<TicketTierRow, "id" | "sold">;

export type TicketTierUpdateRecord = Partial<Omit<TicketTierRow, "id" | "event_id">>;
