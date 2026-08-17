"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { clientFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/envelope";
import type { MembershipSubscriptionStatus } from "@/lib/api/types";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";

export function MembershipSubscriptionActions({ id, status }: { id: string; status: MembershipSubscriptionStatus }) {
    const router = useRouter();
    const [loading, setLoading] = useState<"confirm" | "reject" | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function runAction(action: "confirm" | "reject") {
        setLoading(action);
        setError(null);

        try {
            await clientFetch(`/api/v1/admin/membership/subscriptions/${id}/${action}`, { method: "POST" });
            router.refresh();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Thao tác thất bại.");
        } finally {
            setLoading(null);
        }
    }

    const canConfirm = status === "payment_received";
    const canReject = status === "pending_payment" || status === "payment_received";

    if (!canConfirm && !canReject) {
        return <span className="text-xs text-muted">—</span>;
    }

    return (
        <div className="flex flex-col items-end gap-1">
            <div className="flex gap-2">
                {canConfirm && (
                    <Button type="button" size="sm" disabled={loading !== null} onClick={() => runAction("confirm")}>
                        {loading === "confirm" ? <Spinner /> : "Xác nhận"}
                    </Button>
                )}
                {canReject && (
                    <Button type="button" size="sm" variant="danger" disabled={loading !== null} onClick={() => runAction("reject")}>
                        {loading === "reject" ? <Spinner /> : "Từ chối"}
                    </Button>
                )}
            </div>
            {error && <div className="max-w-55"><Alert>{error}</Alert></div>}
        </div>
    );
}
