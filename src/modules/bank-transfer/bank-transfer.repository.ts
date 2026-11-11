import { createAdminClient } from "@/lib/supabase/admin";
import { AuthException } from "@/modules/auth/auth.errors";

const QUEUE_LIMIT = 100;

export interface PendingBookingTransferRow {
    id: string;
    user_id: string;
    venue_id: string;
    booking_date: string;
    booking_time: string;
    deposit_amount: number;
    payment_ref: string | null;
    payment_claimed_at: string | null;
    created_at: string;
}

export interface PendingTicketOrderTransferRow {
    id: string;
    user_id: string;
    event_id: string;
    total_amount: number;
    payment_ref: string | null;
    payment_claimed_at: string | null;
    created_at: string;
}

export interface PendingMembershipTransferRow {
    id: string;
    user_id: string;
    tier: string;
    amount: number;
    status: string;
    payment_ref: string;
    payment_claimed_at: string | null;
    created_at: string;
}

// Read-only queries behind the admin reconciliation queue.
export class BankTransferRepository {
    private get supabase() {
        return createAdminClient();
    }

    async listPendingBookings() {
        const { data, error } = await this.supabase
            .from("bookings")
            .select("id, user_id, venue_id, booking_date, booking_time, deposit_amount, payment_ref, payment_claimed_at, created_at")
            .eq("payment_method", "bank_transfer")
            .eq("status", "pending")
            .eq("deposit_paid", false)
            .gt("deposit_amount", 0)
            .order("created_at", { ascending: false })
            .limit(QUEUE_LIMIT)
            .returns<PendingBookingTransferRow[]>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return data ?? [];
    }

    async listPendingTicketOrders() {
        const { data, error } = await this.supabase
            .from("ticket_orders")
            .select("id, user_id, event_id, total_amount, payment_ref, payment_claimed_at, created_at")
            .eq("payment_method", "bank_transfer")
            .eq("status", "pending")
            .order("created_at", { ascending: false })
            .limit(QUEUE_LIMIT)
            .returns<PendingTicketOrderTransferRow[]>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return data ?? [];
    }

    async listPendingMemberships() {
        const { data, error } = await this.supabase
            .from("membership_subscriptions")
            .select("id, user_id, tier, amount, status, payment_ref, payment_claimed_at, created_at")
            .eq("payment_method", "bank_transfer")
            .in("status", ["pending_payment", "payment_received"])
            .order("created_at", { ascending: false })
            .limit(QUEUE_LIMIT)
            .returns<PendingMembershipTransferRow[]>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return data ?? [];
    }

    async findUsers(ids: string[]) {
        return this.findNames<{ id: string; email: string | null; display_name: string | null }>(
            "users",
            "id, email, display_name",
            ids
        );
    }

    async findVenueNames(ids: string[]) {
        return this.findNames<{ id: string; name: string }>("venues", "id, name", ids);
    }

    async findEventTitles(ids: string[]) {
        return this.findNames<{ id: string; title: string }>("events", "id, title", ids);
    }

    private async findNames<T extends { id: string }>(table: string, columns: string, ids: string[]) {
        const uniqueIds = [...new Set(ids)];

        if (uniqueIds.length === 0) {
            return new Map<string, T>();
        }

        const { data, error } = await this.supabase
            .from(table)
            .select(columns)
            .in("id", uniqueIds)
            .returns<T[]>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return new Map((data ?? []).map((row) => [row.id, row]));
    }
}
