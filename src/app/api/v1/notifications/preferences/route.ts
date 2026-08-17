import { requireAuth } from "@/modules/auth/auth.guard";
import { failure, readJson, success } from "@/modules/auth/auth.response";
import { NotificationPreferenceService } from "@/modules/notifications/preferences/notification-preference.service";
import type { UpdateNotificationPreferenceDTO } from "@/modules/notifications/preferences/notification-preference.types";

const notificationPreferenceService = new NotificationPreferenceService();

export async function GET() {
    try {
        const user = await requireAuth();
        const data = await notificationPreferenceService.getMine(user);

        return success(data);
    } catch (error) {
        return failure(error);
    }
}

export async function PUT(request: Request) {
    try {
        const user = await requireAuth();
        const data = await notificationPreferenceService.updateMine(
            await readJson<UpdateNotificationPreferenceDTO>(request),
            user
        );

        return success(data);
    } catch (error) {
        return failure(error);
    }
}
