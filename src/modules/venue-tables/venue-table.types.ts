export interface CreateVenueTableDTO {
    table_name: string;
    type?: string;
    capacity: number;
    min_spend?: number | null;
    deposit_required?: number;
    is_active?: boolean;
}

export interface UpdateVenueTableDTO {
    table_name?: string;
    type?: string;
    capacity?: number;
    min_spend?: number | null;
    deposit_required?: number;
    is_active?: boolean;
}

export interface VenueTableListQuery {
    is_active?: boolean;
    type?: string;
    page: number;
    limit: number;
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

export type VenueTableRecord = Omit<VenueTableRow, "id">;
