import { createAdminClient } from "@/lib/supabase/admin";
import { AuthException } from "@/modules/auth/auth.errors";
import { mapVenueTable } from "./venue-table.mapper";
import type {
    VenueTableListQuery,
    VenueTableRecord,
    VenueTableRow,
} from "./venue-table.types";

const VENUE_TABLES_TABLE = "venue_tables";

type UpdateVenueTableRecord = Partial<VenueTableRecord>;

export class VenueTableRepository {
    private get supabase() {
        return createAdminClient();
    }

    async listByVenue(venueId: string, query: VenueTableListQuery) {
        const from = (query.page - 1) * query.limit;
        const to = from + query.limit - 1;
        let request = this.supabase
            .from(VENUE_TABLES_TABLE)
            .select("*", { count: "exact" })
            .eq("venue_id", venueId);

        if (query.is_active !== undefined) {
            request = request.eq("is_active", query.is_active);
        }

        if (query.type) {
            request = request.eq("type", query.type);
        }

        const { data, error, count } = await request
            .order("capacity", { ascending: true })
            .order("table_name", { ascending: true })
            .range(from, to)
            .returns<VenueTableRow[]>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        const total = count ?? 0;

        return {
            items: (data ?? []).map(mapVenueTable),
            pagination: {
                page: query.page,
                limit: query.limit,
                total,
                total_pages: Math.ceil(total / query.limit),
            },
        };
    }

    async findById(venueId: string, tableId: string) {
        const { data, error } = await this.supabase
            .from(VENUE_TABLES_TABLE)
            .select("*")
            .eq("venue_id", venueId)
            .eq("id", tableId)
            .maybeSingle<VenueTableRow>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return data ? mapVenueTable(data) : null;
    }

    async create(input: VenueTableRecord) {
        const { data, error } = await this.supabase
            .from(VENUE_TABLES_TABLE)
            .insert(input)
            .select("*")
            .single<VenueTableRow>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return mapVenueTable(data);
    }

    async update(venueId: string, tableId: string, input: UpdateVenueTableRecord) {
        const { data, error } = await this.supabase
            .from(VENUE_TABLES_TABLE)
            .update(input)
            .eq("venue_id", venueId)
            .eq("id", tableId)
            .select("*")
            .single<VenueTableRow>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return mapVenueTable(data);
    }

    async softDelete(venueId: string, tableId: string) {
        return this.update(venueId, tableId, {
            is_active: false,
        });
    }
}
