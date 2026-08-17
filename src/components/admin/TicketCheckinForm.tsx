"use client";

import { useState, type FormEvent } from "react";
import { clientFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/envelope";
import type { Ticket } from "@/lib/api/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";
import { TicketStatusBadge } from "@/components/tickets/TicketStatusBadge";

export function TicketCheckinForm() {
    const [code, setCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<Ticket | null>(null);

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();
        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const data = await clientFetch<{ ticket: Ticket }>(`/api/v1/tickets/${code.trim()}/checkin`, {
                method: "POST",
            });

            setResult(data.ticket);
            setCode("");
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Không check-in được vé này.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="flex flex-col gap-4">
            <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex-1">
                    <Input
                        required
                        value={code}
                        onChange={(event) => setCode(event.target.value)}
                        placeholder="Nhập mã vé, vd: TICKET_ABCD1234..."
                        className="font-mono"
                        autoFocus
                    />
                </div>
                <Button type="submit" disabled={loading || !code.trim()}>
                    {loading ? <Spinner /> : "Check-in"}
                </Button>
            </form>

            {error && <Alert>{error}</Alert>}

            {result && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                    <div className="mb-2 flex items-center gap-2">
                        <TicketStatusBadge status={result.status} />
                        <span className="font-mono text-xs text-muted">{result.ticket_code}</span>
                    </div>
                    <p className="text-sm text-emerald-400">
                        ✓ Check-in thành công lúc {result.checked_in_at ? new Date(result.checked_in_at).toLocaleString("vi-VN") : "—"}
                    </p>
                </div>
            )}
        </div>
    );
}
