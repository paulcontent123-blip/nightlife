import { EmailProvider, type EmailMessage } from "./providers/email.provider";
import { PushNotificationService } from "./push-notification.service";
import type { PushNotificationPayload } from "./tokens/push-token.types";

export class NotificationService {
    constructor(
        private emailProvider = new EmailProvider(),
        private pushNotificationService = new PushNotificationService()
    ) { }

    isEmailConfigured() {
        return this.emailProvider.isConfigured();
    }

    async sendEmail(input: EmailMessage) {
        return this.emailProvider.send(input);
    }

    async sendPushToUser(userId: string, payload: PushNotificationPayload) {
        return this.pushNotificationService.sendToUser(userId, payload);
    }

    async sendFanout(input: {
        emails?: EmailMessage[];
        pushes?: Array<{
            userId: string;
            payload: PushNotificationPayload;
        }>;
    }) {
        const emailTasks = (input.emails ?? []).map((email) => this.sendEmail(email));
        const pushTasks = (input.pushes ?? []).map((push) => this.sendPushToUser(push.userId, push.payload));
        const results = await Promise.allSettled([...emailTasks, ...pushTasks]);

        return {
            total_count: results.length,
            fulfilled_count: results.filter((result) => result.status === "fulfilled").length,
            rejected_count: results.filter((result) => result.status === "rejected").length,
            results,
        };
    }
}
