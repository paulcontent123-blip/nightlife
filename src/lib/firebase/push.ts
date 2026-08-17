import { getToken, onMessage, type MessagePayload } from "firebase/messaging";
import { getFirebaseMessaging } from "./client";
import { clientFetch } from "@/lib/api/client";

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

export type RegisterPushResult =
    | { status: "success" }
    | { status: "permission_denied" }
    | { status: "unsupported"; message: string }
    | { status: "error"; message: string };

export async function registerPushToken(): Promise<RegisterPushResult> {
    if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator)) {
        return { status: "unsupported", message: "Trình duyệt này không hỗ trợ push notification." };
    }

    const messaging = await getFirebaseMessaging();

    if (!messaging) {
        return { status: "unsupported", message: "Trình duyệt này không hỗ trợ push notification." };
    }

    try {
        const permission = await Notification.requestPermission();

        if (permission !== "granted") {
            return { status: "permission_denied" };
        }

        const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
        const token = await getToken(messaging, {
            vapidKey: VAPID_KEY,
            serviceWorkerRegistration: registration,
        });

        if (!token) {
            return { status: "error", message: "Không lấy được device token, vui lòng thử lại." };
        }

        await clientFetch("/api/v1/notifications/device-token", {
            method: "POST",
            body: JSON.stringify({ token, platform: "web", user_agent: navigator.userAgent }),
        });

        return { status: "success" };
    } catch {
        return { status: "error", message: "Không bật được thông báo, vui lòng thử lại." };
    }
}

export async function subscribeForegroundMessages(callback: (payload: MessagePayload) => void) {
    const messaging = await getFirebaseMessaging();

    if (!messaging) {
        return () => {};
    }

    return onMessage(messaging, callback);
}
