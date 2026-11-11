import { createAdminClient } from "@/lib/supabase/admin";
import { AuthException } from "@/modules/auth/auth.errors";
import { mapPassportPointTransaction } from "./passport.mapper";
import type {
    AdminPassportTransactionQuery,
    PassportMineQuery,
    PassportPointTransactionRecord,
    PassportPointTransactionRow,
} from "./passport.types";

const USERS_TABLE = "users";
const PASSPORT_POINT_TRANSACTIONS_TABLE = "passport_point_transactions";

export class PassportRepository {
    private get supabase() {
        return createAdminClient();
    }

    async findUserPoints(userId: string) {
        const { data, error } = await this.supabase
            .from(USERS_TABLE)
            .select("nightlife_passport_points")
            .eq("id", userId)
            .maybeSingle<{ nightlife_passport_points: number | null }>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return data?.nightlife_passport_points ?? 0;
    }

    // Atomically applies a point change via the apply_passport_points SQL
    // function: locks the user row, rejects negative balances, and returns the
    // existing transaction (applied=false) when the source was already used.
    async applyPointTransaction(input: PassportPointChangeInput): Promise<PassportPointChangeResult> {
        const { data, error } = await this.supabase.rpc("apply_passport_points", {
            p_user_id: input.user_id,
            p_points: input.points,
            p_source_type: input.source_type,
            p_source_id: input.source_id,
            p_description: input.description ?? null,
        });

        if (error) {
            if (error.message?.includes("PASSPORT_INSUFFICIENT_POINTS")) {
                throw new AuthException(409, "PASSPORT_INSUFFICIENT_POINTS");
            }

            if (error.message?.includes("PASSPORT_USER_NOT_FOUND")) {
                throw new AuthException(404, "USER_NOT_FOUND");
            }

            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        const result = data as {
            applied: boolean;
            balance_before: number;
            transaction: PassportPointTransactionRow;
        };

        return {
            applied: result.applied,
            balanceBefore: result.balance_before,
            transaction: mapPassportPointTransaction(result.transaction),
        };
    }

    async listTransactions(userId: string, query: PassportMineQuery) {
        const from = (query.page - 1) * query.limit;
        const to = from + query.limit - 1;
        const { data, error, count } = await this.supabase
            .from(PASSPORT_POINT_TRANSACTIONS_TABLE)
            .select("*", { count: "exact" })
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .range(from, to)
            .returns<PassportPointTransactionRow[]>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        const total = count ?? 0;

        return {
            items: (data ?? []).map(mapPassportPointTransaction),
            pagination: {
                page: query.page,
                limit: query.limit,
                total,
                total_pages: Math.ceil(total / query.limit),
            },
        };
    }

    async listCheckins(userId: string, limit = 20) {
        const { data, error } = await this.supabase
            .from(PASSPORT_POINT_TRANSACTIONS_TABLE)
            .select("*")
            .eq("user_id", userId)
            .eq("source_type", "venue_checkin")
            .order("created_at", { ascending: false })
            .limit(limit)
            .returns<PassportPointTransactionRow[]>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return (data ?? []).map(mapPassportPointTransaction);
    }

    async listAllTransactions(query: AdminPassportTransactionQuery) {
        const from = (query.page - 1) * query.limit;
        const to = from + query.limit - 1;
        let request = this.supabase
            .from(PASSPORT_POINT_TRANSACTIONS_TABLE)
            .select("*", { count: "exact" });

        if (query.source_type) {
            request = request.eq("source_type", query.source_type);
        }

        const { data, error, count } = await request
            .order("created_at", { ascending: false })
            .range(from, to)
            .returns<PassportPointTransactionRow[]>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        const total = count ?? 0;

        return {
            items: (data ?? []).map(mapPassportPointTransaction),
            pagination: {
                page: query.page,
                limit: query.limit,
                total,
                total_pages: Math.ceil(total / query.limit),
            },
        };
    }

}

export type PassportPointChangeInput = Omit<PassportPointTransactionRecord, "balance_after">;

export interface PassportPointChangeResult {
    applied: boolean;
    balanceBefore: number;
    transaction: ReturnType<typeof mapPassportPointTransaction>;
}
