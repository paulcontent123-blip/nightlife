"use client";

import { useState } from "react";
import { registerPushToken } from "@/lib/firebase/push";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

export function EnableNotificationsButton() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<"success" | "permission_denied" | "unsupported" | "error" | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    async function handleClick() {
        setLoading(true);
        setResult(null);
        setMessage(null);

        const outcome = await registerPushToken();
        setResult(outcome.status);
        if (outcome.status !== "success") {
            setMessage("message" in outcome ? outcome.message : null);
        }
        setLoading(false);
    }

    return (
        <div className="flex flex-col gap-2.5">
            <Button type="button" onClick={handleClick} disabled={loading || result === "success"}>
                {result === "success" ? "✓ Đã bật thông báo" : loading ? "Đang bật..." : "🔔 Bật thông báo"}
            </Button>

            {result === "success" && <Alert tone="success">Thiết bị này đã đăng ký nhận thông báo đẩy.</Alert>}
            {result === "permission_denied" && (
                <Alert>Bạn đã từ chối quyền thông báo. Hãy bật lại trong cài đặt trình duyệt cho trang này.</Alert>
            )}
            {(result === "unsupported" || result === "error") && <Alert>{message ?? "Không thể bật thông báo."}</Alert>}
        </div>
    );
}
