import type { Metadata } from "next";
import { serverFetch } from "@/lib/api/server";
import type { FirebaseStatusResult } from "@/lib/api/types";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { TestPushForm } from "@/components/admin/TestPushForm";

export const metadata: Metadata = { title: "Thông báo · Admin Nightlife.vn" };

export default async function AdminNotificationsPage() {
    const status = await serverFetch<FirebaseStatusResult>("/api/v1/notifications/firebase/status");

    return (
        <div className="flex flex-col gap-6">
            <div>
                <p className="mb-1 text-sm font-medium text-muted">Quản lý</p>
                <h1 className="font-display text-2xl font-extrabold">Thông báo</h1>
            </div>

            <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">Firebase Cloud Messaging</p>
                    <p className="mt-1 text-sm text-white">Project: {status.project_id ?? "—"}</p>
                </div>
                <Badge tone={status.configured ? "green" : "red"}>
                    {status.configured ? "✓ Đã cấu hình" : "Chưa cấu hình"}
                </Badge>
            </Card>

            <TestPushForm />
        </div>
    );
}
