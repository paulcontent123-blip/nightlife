import { createAdminClient } from "@/lib/supabase/admin";
import { AuthException } from "@/modules/auth/auth.errors";
import type {
    NotificationPreferenceRow,
    UpdateNotificationPreferenceDTO,
} from "./notification-preference.types";

const NOTIFICATION_PREFERENCES_TABLE = "notification_preferences";

export class NotificationPreferenceRepository {
    private get supabase() {
        return createAdminClient();
    }

    async findByUserId(userId: string) {
        const { data, error } = await this.supabase
            .from(NOTIFICATION_PREFERENCES_TABLE)
            .select("*")
            .eq("user_id", userId)
            .maybeSingle<NotificationPreferenceRow>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return data;
    }

    async upsert(userId: string, input: UpdateNotificationPreferenceDTO) {
        const { data, error } = await this.supabase
            .from(NOTIFICATION_PREFERENCES_TABLE)
            .upsert(
                {
                    user_id: userId,
                    ...input,
                },
                { onConflict: "user_id" }
            )
            .select("*")
            .single<NotificationPreferenceRow>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return data;
    }

    async listHappyHourOptInUsers(input: {
        city: string | null;
        district: string | null;
    }) {
        let request = this.supabase
            .from(NOTIFICATION_PREFERENCES_TABLE)
            .select("*")
            .eq("happy_hour_push_enabled", true);

        if (input.city) {
            request = request.or(`happy_hour_city.is.null,happy_hour_city.eq.${input.city}`);
        } else {
            request = request.is("happy_hour_city", null);
        }

        const { data, error } = await request.returns<NotificationPreferenceRow[]>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return (data ?? []).filter((preference) =>
            !preference.happy_hour_district
            || !input.district
            || preference.happy_hour_district === input.district
        );
    }
}
