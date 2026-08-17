import { getFirebaseMessaging, hasFirebaseCredentials } from "@/config/firebase";
import type { PushNotificationPayload } from "../tokens/push-token.types";

const FCM_BATCH_SIZE = 500;

export class FcmPushProvider {
    isConfigured() {
        return hasFirebaseCredentials();
    }

    async sendToTokens(tokens: string[], payload: PushNotificationPayload) {
        if (!this.isConfigured()) {
            return {
                sent: false,
                skipped: true,
                reason: "missing_firebase_credentials",
                success_count: 0,
                failure_count: 0,
                invalid_tokens: [] as string[],
            };
        }

        if (tokens.length === 0) {
            return {
                sent: false,
                skipped: true,
                reason: "no_active_tokens",
                success_count: 0,
                failure_count: 0,
                invalid_tokens: [] as string[],
            };
        }

        let successCount = 0;
        let failureCount = 0;
        const invalidTokens: string[] = [];
        const messaging = getFirebaseMessaging();

        for (const batch of chunk(tokens, FCM_BATCH_SIZE)) {
            const response = await messaging.sendEachForMulticast({
                tokens: batch,
                notification: {
                    title: payload.title,
                    body: payload.body,
                },
                data: normalizeData({
                    ...(payload.data ?? {}),
                    ...(payload.link ? { link: payload.link } : {}),
                }),
                webpush: payload.link
                    ? {
                        fcmOptions: {
                            link: payload.link,
                        },
                    }
                    : undefined,
            });

            successCount += response.successCount;
            failureCount += response.failureCount;

            response.responses.forEach((result, index) => {
                if (!result.success && isInvalidFcmTokenError(result.error)) {
                    invalidTokens.push(batch[index]);
                }
            });
        }

        return {
            sent: successCount > 0,
            skipped: false,
            success_count: successCount,
            failure_count: failureCount,
            invalid_tokens: invalidTokens,
        };
    }
}

function normalizeData(data: Record<string, string | number | boolean | null | undefined>) {
    return Object.fromEntries(
        Object.entries(data)
            .filter(([, value]) => value !== null && value !== undefined)
            .map(([key, value]) => [key, String(value)])
    );
}

function chunk<T>(items: T[], size: number) {
    const chunks: T[][] = [];

    for (let index = 0; index < items.length; index += size) {
        chunks.push(items.slice(index, index + size));
    }

    return chunks;
}

function isInvalidFcmTokenError(error: unknown) {
    if (!error || typeof error !== "object" || !("code" in error)) {
        return false;
    }

    const code = (error as { code?: unknown }).code;

    return code === "messaging/registration-token-not-registered"
        || code === "messaging/invalid-registration-token"
        || code === "messaging/invalid-argument";
}
