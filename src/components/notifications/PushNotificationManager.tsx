"use client";

import { useEffect, useState } from "react";
import type { MessagePayload } from "firebase/messaging";

export function PushNotificationManager() {
    const [toast, setToast] = useState<{ title: string; body: string } | null>(null);

    useEffect(() => {
        if (typeof window === "undefined" || !("Notification" in window)) {
            return;
        }

        let active = true;
        let unsubscribe: (() => void) | undefined;
        const timer = window.setTimeout(() => {
            import("@/lib/firebase/push")
                .then(async ({ registerPushToken, subscribeForegroundMessages }) => {
                    if (!active) {
                        return;
                    }

                    if (Notification.permission === "granted") {
                        await registerPushToken().catch(() => {});
                    }

                    if (!active) {
                        return;
                    }

                    const nextUnsubscribe = await subscribeForegroundMessages((payload: MessagePayload) => {
                        setToast({
                            title: payload.notification?.title ?? payload.data?.title ?? "Nightlife.vn",
                            body: payload.notification?.body ?? payload.data?.body ?? "",
                        });
                    });

                    if (!active) {
                        nextUnsubscribe();
                        return;
                    }

                    unsubscribe = nextUnsubscribe;
                })
                .catch(() => {});
        }, 1500);

        return () => {
            active = false;
            window.clearTimeout(timer);
            unsubscribe?.();
        };
    }, []);

    useEffect(() => {
        if (!toast) return;
        const timer = setTimeout(() => setToast(null), 6000);
        return () => clearTimeout(timer);
    }, [toast]);

    if (!toast) {
        return null;
    }

    return (
        <div className="fixed bottom-4 left-4 right-4 z-[100] w-auto rounded-xl border border-border bg-void-2 p-4 shadow-2xl sm:bottom-5 sm:left-auto sm:right-5 sm:w-80">
            <div className="flex items-start justify-between gap-2">
                <div>
                    <p className="font-display text-sm font-bold text-amber">{toast.title}</p>
                    {toast.body && <p className="mt-1 text-xs text-muted">{toast.body}</p>}
                </div>
                <button
                    type="button"
                    onClick={() => setToast(null)}
                    aria-label="Close"
                    title="Close"
                    className="shrink-0 text-xs text-muted-2 hover:text-white"
                >
                    ✕
                </button>
            </div>
        </div>
    );
}
