"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { clientFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/envelope";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";

export function ReplyForm({ postId, parentId, onDone }: { postId: string; parentId?: string; onDone?: () => void }) {
    const router = useRouter();
    const [content, setContent] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [requiresLogin, setRequiresLogin] = useState(false);

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();
        setLoading(true);
        setError(null);
        setRequiresLogin(false);

        try {
            await clientFetch(`/api/v1/forum/posts/${postId}/replies`, {
                method: "POST",
                body: JSON.stringify({ content, parent_id: parentId ?? null }),
            });

            setContent("");
            onDone?.();
            router.refresh();
        } catch (err) {
            if (err instanceof ApiError && err.status === 401) {
                setRequiresLogin(true);
            } else {
                setError(err instanceof ApiError ? err.message : "Không gửi được trả lời, vui lòng thử lại.");
            }
        } finally {
            setLoading(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            <Textarea
                required
                maxLength={3000}
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="Viết trả lời..."
                className="min-h-20"
            />
            {requiresLogin && (
                <Alert>
                    Vui lòng{" "}
                    <a href={`/login?next=/forum/${postId}`} className="font-semibold underline">
                        đăng nhập
                    </a>{" "}
                    để trả lời.
                </Alert>
            )}
            {error && <Alert>{error}</Alert>}
            <Button type="submit" size="sm" disabled={loading} className="self-start">
                {loading ? "Đang gửi..." : "Gửi trả lời"}
            </Button>
        </form>
    );
}
