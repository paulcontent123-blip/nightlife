import { createAdminClient } from "@/lib/supabase/admin";
import { AuthException } from "@/modules/auth/auth.errors";
import type {
    NotificationJobRecord,
    NotificationJobRow,
    NotificationJobUpdate,
} from "./notification-job.types";

const NOTIFICATION_JOBS_TABLE = "notification_jobs";

export class NotificationJobRepository {
    private get supabase() {
        return createAdminClient();
    }

    async createJob(input: NotificationJobRecord) {
        const { data, error } = await this.supabase
            .from(NOTIFICATION_JOBS_TABLE)
            .insert({
                ...input,
                status: input.status ?? "pending",
                max_attempts: input.max_attempts ?? 3,
            })
            .select("*")
            .single<NotificationJobRow>();

        if (error) {
            if (isUniqueViolation(error) && input.source_type && input.source_id && input.user_id) {
                return this.findBySource({
                    type: input.type,
                    sourceType: input.source_type,
                    sourceId: input.source_id,
                    userId: input.user_id,
                });
            }

            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return data;
    }

    async createOrRefreshPendingJob(input: NotificationJobRecord) {
        const job = await this.createJob(input);

        if (!job || job.status === "sent") {
            return job;
        }

        return this.updateJob(job.id, {
            scheduled_at: input.scheduled_at,
            payload: input.payload,
            status: input.status ?? "pending",
            attempt_count: 0,
            locked_at: null,
            sent_at: null,
            last_error: null,
        });
    }

    async findBySource(input: {
        type: string;
        sourceType: string;
        sourceId: string;
        userId: string;
    }) {
        const { data, error } = await this.supabase
            .from(NOTIFICATION_JOBS_TABLE)
            .select("*")
            .eq("type", input.type)
            .eq("source_type", input.sourceType)
            .eq("source_id", input.sourceId)
            .eq("user_id", input.userId)
            .maybeSingle<NotificationJobRow>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return data;
    }

    async listDuePendingJobs(input: {
        now: string;
        limit: number;
    }) {
        const { data, error } = await this.supabase
            .from(NOTIFICATION_JOBS_TABLE)
            .select("*")
            .eq("status", "pending")
            .lte("scheduled_at", input.now)
            .order("scheduled_at", { ascending: true })
            .limit(input.limit)
            .returns<NotificationJobRow[]>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return data ?? [];
    }

    async claimJob(id: string, lockedAt: string) {
        const { data, error } = await this.supabase
            .from(NOTIFICATION_JOBS_TABLE)
            .update({
                status: "processing",
                locked_at: lockedAt,
            })
            .eq("id", id)
            .eq("status", "pending")
            .select("*")
            .maybeSingle<NotificationJobRow>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return data;
    }

    async updateJob(id: string, input: NotificationJobUpdate) {
        const { data, error } = await this.supabase
            .from(NOTIFICATION_JOBS_TABLE)
            .update(input)
            .eq("id", id)
            .select("*")
            .single<NotificationJobRow>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return data;
    }
}

function isUniqueViolation(error: unknown) {
    return Boolean(error && typeof error === "object" && (error as { code?: unknown }).code === "23505");
}
