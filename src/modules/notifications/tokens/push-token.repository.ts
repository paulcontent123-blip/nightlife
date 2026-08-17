import { createAdminClient } from "@/lib/supabase/admin";
import { AuthException } from "@/modules/auth/auth.errors";
import type { PushPlatform, PushTokenRow } from "./push-token.types";

const USER_PUSH_TOKENS_TABLE = "user_push_tokens";

export class PushTokenRepository {
    private get supabase() {
        return createAdminClient();
    }

    async upsertToken(input: {
        userId: string;
        token: string;
        platform: PushPlatform;
        userAgent?: string | null;
    }) {
        const now = new Date().toISOString();
        const { data, error } = await this.supabase
            .from(USER_PUSH_TOKENS_TABLE)
            .upsert(
                {
                    user_id: input.userId,
                    token: input.token,
                    platform: input.platform,
                    user_agent: input.userAgent ?? null,
                    is_active: true,
                    last_seen_at: now,
                },
                { onConflict: "token" }
            )
            .select("*")
            .single<PushTokenRow>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return data;
    }

    async deleteToken(userId: string, token: string) {
        const { data, error } = await this.supabase
            .from(USER_PUSH_TOKENS_TABLE)
            .delete()
            .eq("user_id", userId)
            .eq("token", token)
            .select("id, token")
            .returns<Array<{ id: string; token: string }>>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return {
            deleted: (data ?? []).length > 0,
            token,
        };
    }

    async listActiveTokensForUser(userId: string) {
        const { data, error } = await this.supabase
            .from(USER_PUSH_TOKENS_TABLE)
            .select("*")
            .eq("user_id", userId)
            .eq("is_active", true)
            .returns<PushTokenRow[]>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return data ?? [];
    }

    async deactivateTokens(tokens: string[]) {
        if (tokens.length === 0) {
            return;
        }

        const { error } = await this.supabase
            .from(USER_PUSH_TOKENS_TABLE)
            .update({ is_active: false })
            .in("token", tokens);

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }
    }
}
