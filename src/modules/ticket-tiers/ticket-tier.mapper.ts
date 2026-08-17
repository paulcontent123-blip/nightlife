import type { TicketTierRow } from "./ticket-tier.types";

export function mapTicketTier(row: TicketTierRow) {
    return {
        id: row.id,
        event_id: row.event_id,
        name: row.name,
        price: row.price,
        quantity: row.quantity,
        sold: row.sold,
        available: Math.max(row.quantity - row.sold, 0),
        includes: row.includes ?? [],
        sale_starts_at: row.sale_starts_at,
        sale_ends_at: row.sale_ends_at,
    };
}
