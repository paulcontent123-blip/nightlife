import { requireAuth } from "@/modules/auth/auth.guard";
import { failure, readJson, success } from "@/modules/auth/auth.response";
import { PushNotificationService } from "@/modules/notifications/push-notification.service";

interface TestPushDTO {
    title?: string;
    body?: string;
    link?: string;
}

const pushNotificationService = new PushNotificationService();

export async function POST(request: Request) {
    try {
        const user = await requireAuth();
        const body = await readJson<TestPushDTO>(request);
        const data = await pushNotificationService.sendToUser(user.id, {
            title: body.title ?? "Nightlife.vn",
            body: body.body ?? "Push notification test is working.",
            link: body.link ?? "/",
            data: {
                type: "test_push",
                user_id: user.id,
            },
        });

        return success(data);
    } catch (error) {
        return failure(error);
    }
}
