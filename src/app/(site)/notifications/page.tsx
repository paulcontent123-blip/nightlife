import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { serverFetch } from "@/lib/api/server";
import { ApiError } from "@/lib/api/envelope";
import type { NotificationPreference } from "@/lib/api/types";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { EnableNotificationsButton } from "@/components/notifications/EnableNotificationsButton";
import { NotificationPreferencesForm } from "@/components/notifications/NotificationPreferencesForm";

export const metadata: Metadata = { title: "Thông báo · Nightlife.vn" };

export default async function NotificationsPage() {
    let preference: NotificationPreference;

    try {
        preference = await serverFetch<NotificationPreference>("/api/v1/notifications/preferences");
    } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
            redirect("/login?next=/notifications");
        }

        throw error;
    }

    return (
        <div className="mx-auto max-w-2xl px-5 py-16 sm:px-10">
            <SectionHeading
                tag="Tài khoản của tôi"
                title="Thông báo"
                description="Bật thông báo đẩy để không bỏ lỡ Happy Hour, xác nhận đặt bàn và vé sự kiện của bạn."
            />

            <div className="mt-6 rounded-xl border border-border bg-void-2 p-5">
                <p className="mb-3 font-display text-sm font-extrabold">🔔 Thông báo đẩy trên thiết bị này</p>
                <EnableNotificationsButton />
            </div>

            <div className="mt-6">
                <NotificationPreferencesForm preference={preference} />
            </div>
        </div>
    );
}
