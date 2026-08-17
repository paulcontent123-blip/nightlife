"use client";

import { useState, type FormEvent } from "react";
import { clientFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/envelope";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";

export function ReportPostButton({ postId }: { postId: string }) {
    const [expanded, setExpanded] = useState(false);
    const [reason, setReason] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState(false);
    const [requiresLogin, setRequiresLogin] = useState(false);

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();
        setLoading(true);
        setError(null);
        setRequiresLogin(false);

        try {
            await clientFetch(`/api/v1/forum/posts/${postId}/report`, {
                method: "POST",
                body: JSON.stringify({ reason }),
            });

            setDone(true);
        } catch (err) {
            if (err instanceof ApiError && err.status === 401) {
                setRequiresLogin(true);
            } else {
                setError(err instanceof ApiError ? err.message : "Không gửi được báo cáo, vui lòng thử lại.");
            }
        } finally {
            setLoading(false);
        }
    }

    if (done) {
        return <p className="text-xs text-muted">✓ Đã gửi báo cáo, cảm ơn bạn.</p>;
    }

    if (!expanded) {
        return (
            <button type="button" onClick={() => setExpanded(true)} className="text-xs font-semibold text-muted hover:text-pink">
                🚩 Báo cáo bài viết
            </button>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 rounded-lg border border-border-strong bg-void-3 p-3">
            <Input
                required
                minLength={2}
                maxLength={80}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Lý do báo cáo (spam, ngôn từ xấu...)"
            />
            {requiresLogin && (
                <Alert>
                    Vui lòng{" "}
                    <a href={`/login?next=/forum/${postId}`} className="font-semibold underline">
                        đăng nhập
                    </a>{" "}
                    để báo cáo.
                </Alert>
            )}
            {error && <Alert>{error}</Alert>}
            <div className="flex gap-2">
                <Button type="submit" size="sm" variant="danger" disabled={loading}>
                    {loading ? "Đang gửi..." : "Gửi báo cáo"}
                </Button>
                <Button type="button" size="sm" variant="secondary" onClick={() => setExpanded(false)}>
                    Huỷ
                </Button>
            </div>
        </form>
    );
}
