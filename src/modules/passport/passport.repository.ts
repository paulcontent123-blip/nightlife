import { createAdminClient } from "@/lib/supabase/admin";
import { AuthException } from "@/modules/auth/auth.errors";
import { mapPassportPointTransaction } from "./passport.mapper";
import type {
    AdminPassportTransactionQuery,
    PassportMineQuery,
    PassportPointSourceType,
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

    async updateUserPoints(userId: string, points: number) {
        const { error } = await this.supabase
            .from(USERS_TABLE)
            .update({ nightlife_passport_points: points })
            .eq("id", userId);

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }
    }

    async findTransaction(userId: string, sourceType: PassportPointSourceType, sourceId: string) {
        const { data, error } = await this.supabase
            .from(PASSPORT_POINT_TRANSACTIONS_TABLE)
            .select("*")
            .eq("user_id", userId)
            .eq("source_type", sourceType)
            .eq("source_id", sourceId)
            .maybeSingle<PassportPointTransactionRow>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return data ? mapPassportPointTransaction(data) : null;
    }

    async createTransaction(input: PassportPointTransactionRecord) {
        const { data, error } = await this.supabase
            .from(PASSPORT_POINT_TRANSACTIONS_TABLE)
            .insert(input)
            .select("*")
            .single<PassportPointTransactionRow>();

        if (error) {
            if (isUniqueViolation(error)) {
                return this.findTransaction(input.user_id, input.source_type, input.source_id);
            }

            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return mapPassportPointTransaction(data);
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

function isUniqueViolation(error: unknown) {
    return Boolean(error && typeof error === "object" && (error as { code?: unknown }).code === "23505");
}
