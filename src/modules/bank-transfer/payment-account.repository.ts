import { createAdminClient } from "@/lib/supabase/admin";
import { AuthException } from "@/modules/auth/auth.errors";

const PAYMENT_ACCOUNTS_TABLE = "payment_accounts";

export interface PaymentAccount {
    id: string;
    bank_bin: string;
    bank_code: string;
    bank_name: string;
    account_number: string;
    account_name: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export type PaymentAccountRecord = Pick<
    PaymentAccount,
    "bank_bin" | "bank_code" | "bank_name" | "account_number" | "account_name"
>;

export class PaymentAccountRepository {
    private get supabase() {
        return createAdminClient();
    }

    async list() {
        const { data, error } = await this.supabase
            .from(PAYMENT_ACCOUNTS_TABLE)
            .select("*")
            .order("is_active", { ascending: false })
            .order("created_at", { ascending: false })
            .returns<PaymentAccount[]>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return data ?? [];
    }

    async findActive() {
        const { data, error } = await this.supabase
            .from(PAYMENT_ACCOUNTS_TABLE)
            .select("*")
            .eq("is_active", true)
            .maybeSingle<PaymentAccount>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return data;
    }

    async findById(id: string) {
        const { data, error } = await this.supabase
            .from(PAYMENT_ACCOUNTS_TABLE)
            .select("*")
            .eq("id", id)
            .maybeSingle<PaymentAccount>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return data;
    }

    async create(input: PaymentAccountRecord) {
        const { data, error } = await this.supabase
            .from(PAYMENT_ACCOUNTS_TABLE)
            .insert({ ...input, is_active: false })
            .select("*")
            .single<PaymentAccount>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return data;
    }

    // Deactivates every other account first: the partial unique index allows
    // only one active account.
    async activate(id: string) {
        const { error: deactivateError } = await this.supabase
            .from(PAYMENT_ACCOUNTS_TABLE)
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq("is_active", true)
            .neq("id", id);

        if (deactivateError) {
            throw new AuthException(500, "DATABASE_ERROR", deactivateError.message);
        }

        return this.setActive(id, true);
    }

    async deactivate(id: string) {
        return this.setActive(id, false);
    }

    async delete(id: string) {
        const { error } = await this.supabase
            .from(PAYMENT_ACCOUNTS_TABLE)
            .delete()
            .eq("id", id);

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }
    }

    private async setActive(id: string, isActive: boolean) {
        const { data, error } = await this.supabase
            .from(PAYMENT_ACCOUNTS_TABLE)
            .update({ is_active: isActive, updated_at: new Date().toISOString() })
            .eq("id", id)
            .select("*")
            .maybeSingle<PaymentAccount>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        if (!data) {
            throw new AuthException(404, "PAYMENT_ACCOUNT_NOT_FOUND");
        }

        return data;
    }
}
