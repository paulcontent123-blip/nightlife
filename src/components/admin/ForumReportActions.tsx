"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { clientFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/envelope";
import type { ForumReportStatus } from "@/lib/api/types";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

export function ForumReportActions({ reportId, status }: { reportId: string; status: ForumReportStatus }) {
    const router = useRouter();
    const [loading, setLoading] = useState<ForumReportStatus | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function setStatus(nextStatus: ForumReportStatus) {
        setLoading(nextStatus);
        setError(null);

        try {
            await clientFetch(`/api/v1/admin/forum/reports/${reportId}`, {
                method: "PATCH",
                body: JSON.stringify({ status: nextStatus }),
            });
            router.refresh();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Thao tác thất bại.");
        } finally {
            setLoading(null);
        }
    }

    if (status !== "open") {
        return <span className="text-xs text-muted">—</span>;
    }

    return (
        <div className="flex flex-col items-end gap-1">
            <div className="flex gap-2">
                <Button type="button" size="sm" disabled={loading !== null} onClick={() => setStatus("reviewed")}>
                    {loading === "reviewed" ? "..." : "Đã xem xét"}
                </Button>
                <Button type="button" size="sm" variant="secondary" disabled={loading !== null} onClick={() => setStatus("dismissed")}>
                    {loading === "dismissed" ? "..." : "Bỏ qua"}
                </Button>
            </div>
            {error && <div className="max-w-55"><Alert>{error}</Alert></div>}
        </div>
    );
}
