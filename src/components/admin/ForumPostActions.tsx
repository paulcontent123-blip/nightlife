"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { clientFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/envelope";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

export function ForumPostActions({
    postId,
    isApproved,
    isPinned,
}: {
    postId: string;
    isApproved: boolean;
    isPinned: boolean;
}) {
    const router = useRouter();
    const [loading, setLoading] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [confirmingDelete, setConfirmingDelete] = useState(false);

    async function patch(action: string, body: Record<string, boolean>) {
        setLoading(action);
        setError(null);

        try {
            await clientFetch(`/api/v1/admin/forum/posts/${postId}`, {
                method: "PATCH",
                body: JSON.stringify(body),
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
            await clientFetch(`/api/v1/admin/forum/posts/${postId}`, { method: "DELETE" });
            router.push("/admin/forum/posts");
            router.refresh();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Không xoá được bài viết.");
            setLoading(null);
        }
    }

    return (
        <div className="flex flex-col items-end gap-1.5">
            <div className="flex flex-wrap justify-end gap-2">
                <Button
                    type="button"
                    size="sm"
                    variant={isApproved ? "secondary" : "primary"}
                    disabled={loading !== null}
                    onClick={() => patch("approve", { is_approved: !isApproved })}
                >
                    {loading === "approve" ? "..." : isApproved ? "Ẩn bài" : "Duyệt bài"}
                </Button>
                <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={loading !== null}
                    onClick={() => patch("pin", { is_pinned: !isPinned })}
                >
                    {loading === "pin" ? "..." : isPinned ? "Bỏ ghim" : "Ghim"}
                </Button>
                {confirmingDelete ? (
                    <>
                        <Button type="button" size="sm" variant="danger" disabled={loading !== null} onClick={handleDelete}>
                            {loading === "delete" ? "..." : "Xác nhận xoá"}
                        </Button>
                        <Button type="button" size="sm" variant="secondary" onClick={() => setConfirmingDelete(false)}>
                            Thôi
                        </Button>
                    </>
                ) : (
                    <Button type="button" size="sm" variant="danger" onClick={() => setConfirmingDelete(true)}>
                        Xoá
                    </Button>
                )}
            </div>
            {error && <div className="max-w-55"><Alert>{error}</Alert></div>}
        </div>
    );
}
