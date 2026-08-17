"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { clientFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/envelope";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

export function ForumReplyActions({ replyId, isApproved }: { replyId: string; isApproved: boolean }) {
    const router = useRouter();
    const [loading, setLoading] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function toggleApprove() {
        setLoading("approve");
        setError(null);

        try {
            await clientFetch(`/api/v1/admin/forum/replies/${replyId}`, {
                method: "PATCH",
                body: JSON.stringify({ is_approved: !isApproved }),
            });
            router.refresh();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Thao tác thất bại.");
        } finally {
            setLoading(null);
        }
    }

    async function handleDelete() {
        setLoading("delete");
        setError(null);

        try {
            await clientFetch(`/api/v1/admin/forum/replies/${replyId}`, { method: "DELETE" });
            router.refresh();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Không xoá được trả lời.");
        } finally {
            setLoading(null);
        }
    }

    return (
        <div className="flex flex-col items-end gap-1">
            <div className="flex gap-2">
                <Button type="button" size="sm" variant={isApproved ? "secondary" : "primary"} disabled={loading !== null} onClick={toggleApprove}>
                    {loading === "approve" ? "..." : isApproved ? "Ẩn" : "Duyệt"}
                </Button>
                <Button type="button" size="sm" variant="danger" disabled={loading !== null} onClick={handleDelete}>
                    {loading === "delete" ? "..." : "Xoá"}
                </Button>
            </div>
            {error && <div className="max-w-55"><Alert>{error}</Alert></div>}
        </div>
    );
}
