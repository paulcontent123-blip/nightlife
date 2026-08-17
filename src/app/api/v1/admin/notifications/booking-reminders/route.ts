import { requireAdmin } from "@/modules/auth/auth.guard";
import { failure, success } from "@/modules/auth/auth.response";
import { NotificationJobService } from "@/modules/notifications/jobs/notification-job.service";

const notificationJobService = new NotificationJobService();

export async function POST(request: Request) {
    try {
        await requireAdmin();
        const url = new URL(request.url);
        const limit = Number(url.searchParams.get("limit") ?? undefined);
        const data = await notificationJobService.processDueJobs({
            limit: Number.isFinite(limit) ? limit : undefined,
        });

        return success({
            ...data,
            note: "This endpoint now processes notification_jobs queue. Prefer POST /api/v1/admin/notification-jobs/run for new cron jobs.",
        });
    } catch (error) {
        return failure(error);
    }
}
