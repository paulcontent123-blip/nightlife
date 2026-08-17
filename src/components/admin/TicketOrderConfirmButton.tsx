"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { clientFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/envelope";
import type { ConfirmTicketOrderResult } from "@/lib/api/types";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";

export function TicketOrderConfirmButton({ orderId }: { orderId: string }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [issuedCodes, setIssuedCodes] = useState<string[] | null>(null);

    async function handleConfirm() {
        setLoading(true);
        setError(null);

        try {
            const result = await clientFetch<ConfirmTicketOrderResult>(`/api/v1/admin/ticket-orders/${orderId}/confirm`, {
                method: "POST",
            });

            setIssuedCodes(result.tickets.map((ticket) => ticket.ticket_code));
            router.refresh();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Không xác nhận được đơn vé.");
        } finally {
            setLoading(false);
        }
    }

    if (issuedCodes) {
        return (
            <div className="flex flex-col gap-1 text-xs">
                <span className="font-semibold text-emerald-400">✓ Đã phát hành {issuedCodes.length} vé</span>
                {issuedCodes.map((code) => (
                    <span key={code} className="font-mono text-muted">{code}</span>
                ))}
            </div>
        );
    }

    return (
        <div className="flex flex-col items-end gap-1">
            <Button type="button" size="sm" disabled={loading} onClick={handleConfirm}>
                {loading ? <Spinner /> : "Xác nhận"}
            </Button>
            {error && <div className="max-w-55"><Alert>{error}</Alert></div>}
        </div>
    );
}
