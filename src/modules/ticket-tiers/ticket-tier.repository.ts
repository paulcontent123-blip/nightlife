import { createAdminClient } from "@/lib/supabase/admin";
import { AuthException } from "@/modules/auth/auth.errors";
import { mapTicketTier } from "./ticket-tier.mapper";
import type {
    TicketTierRecord,
    TicketTierRow,
    TicketTierUpdateRecord,
} from "./ticket-tier.types";

const TICKET_TIERS_TABLE = "ticket_tiers";
const TICKET_TIER_COLUMNS = [
    "id",
    "event_id",
    "name",
    "price",
    "quantity",
    "sold",
    "includes",
    "sale_starts_at",
    "sale_ends_at",
].join(",");

export class TicketTierRepository {
    private get supabase() {
        return createAdminClient();
    }

    async listByEvent(eventId: string) {
        const { data, error } = await this.supabase
            .from(TICKET_TIERS_TABLE)
            .select(TICKET_TIER_COLUMNS)
            .eq("event_id", eventId)
            .order("price", { ascending: true })
            .returns<TicketTierRow[]>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return (data ?? []).map(mapTicketTier);
    }

    async findById(id: string) {
        const { data, error } = await this.supabase
            .from(TICKET_TIERS_TABLE)
            .select("*")
            .eq("id", id)
            .maybeSingle<TicketTierRow>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return data ? mapTicketTier(data) : null;
    }

    async create(input: TicketTierRecord) {
        const { data, error } = await this.supabase
            .from(TICKET_TIERS_TABLE)
            .insert(input)
            .select("*")
            .single<TicketTierRow>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return mapTicketTier(data);
    }

    async update(id: string, input: TicketTierUpdateRecord) {
        const { data, error } = await this.supabase
            .from(TICKET_TIERS_TABLE)
            .update(input)
            .eq("id", id)
            .select("*")
            .single<TicketTierRow>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return mapTicketTier(data);
    }

    async delete(id: string) {
        const { data, error } = await this.supabase
            .from(TICKET_TIERS_TABLE)
            .delete()
            .eq("id", id)
            .select("*")
            .single<TicketTierRow>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return mapTicketTier(data);
    }
}
