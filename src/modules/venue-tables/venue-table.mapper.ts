import type { VenueTableRow } from "./venue-table.types";

export function mapVenueTable(row: VenueTableRow) {
    return {
        id: row.id,
        venue_id: row.venue_id,
        table_name: row.table_name,
        type: row.type,
        capacity: row.capacity,
        min_spend: row.min_spend,
        deposit_required: row.deposit_required,
        is_active: row.is_active,
    };
}
