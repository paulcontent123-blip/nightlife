import {
    isCronConfigured,
    isValidCronAuthorization,
} from "@/config/cron";
import { AuthException } from "@/modules/auth/auth.errors";
import { failure, success } from "@/modules/auth/auth.response";
import { NotificationJobService } from "@/modules/notifications/jobs/notification-job.service";

const notificationJobService = new NotificationJobService();

export async function POST(request: Request) {
    try {
        if (!isCronConfigured()) {
            throw new AuthException(500, "CRON_NOT_CONFIGURED");
        }

        if (!isValidCronAuthorization(request.headers.get("authorization"))) {
            throw new AuthException(401, "INVALID_CRON_SECRET");
        }

        const url = new URL(request.url);
        const limit = Number(url.searchParams.get("limit") ?? undefined);
        const data = await notificationJobService.processDueJobs({
            limit: Number.isFinite(limit) ? limit : undefined,
        });

        return success({
            ...data,
            runner: {
                provider: "upstash_qstash",
                endpoint: "/api/v1/cron/notification-jobs",
                authenticated_by: "CRON_SECRET",
            },
        });
    } catch (error) {
        return failure(error);
    }
}
