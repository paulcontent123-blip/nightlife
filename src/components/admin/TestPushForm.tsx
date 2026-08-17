"use client";

import { useState, type FormEvent } from "react";
import { clientFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/envelope";
import type { TestPushResult } from "@/lib/api/types";
import { Button } from "@/components/ui/Button";
import { FieldGroup, Input } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";

export function TestPushForm() {
    const [title, setTitle] = useState("");
    const [body, setBody] = useState("");
    const [link, setLink] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<TestPushResult | null>(null);

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();
        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const data = await clientFetch<TestPushResult>("/api/v1/notifications/test-push", {
                method: "POST",
                body: JSON.stringify({
                    title: title || undefined,
                    body: body || undefined,
                    link: link || undefined,
                }),
            });
            setResult(data);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Không gửi được thông báo thử.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-xl border border-border bg-void-2 p-5">
            <p className="font-display text-sm font-extrabold">Gửi thông báo thử tới thiết bị của bạn</p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <FieldGroup label="Tiêu đề (không bắt buộc)">
                    <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Nightlife.vn" />
                </FieldGroup>
                <FieldGroup label="Nội dung (không bắt buộc)">
                    <Input value={body} onChange={(event) => setBody(event.target.value)} placeholder="Test push..." />
                </FieldGroup>
                <FieldGroup label="Link (không bắt buộc)">
                    <Input value={link} onChange={(event) => setLink(event.target.value)} placeholder="/" />
                </FieldGroup>
            </div>

            {error && <Alert>{error}</Alert>}

            {result && (
                <Alert tone={result.success_count > 0 ? "success" : "info"}>
                    Đã gửi: {result.sent} · Thành công: {result.success_count} · Thất bại: {result.failure_count}
                    {result.deactivated_token_count > 0 && ` · Đã vô hiệu hoá ${result.deactivated_token_count} token`}
                    {result.reason && ` · Lý do bỏ qua: ${result.reason}`}
                </Alert>
            )}

            <Button type="submit" disabled={loading} className="self-start">
                {loading ? "Đang gửi..." : "Gửi thử"}
            </Button>
        </form>
    );
}
