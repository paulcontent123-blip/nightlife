"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { clientFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/envelope";

export function CancelBookingButton({ bookingId }: { bookingId: string }) {
    const router = useRouter();
    const [confirming, setConfirming] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleCancel() {
        setLoading(true);
        setError(null);

        try {
            await clientFetch(`/api/v1/bookings/${bookingId}/cancel`, { method: "PUT" });
            router.refresh();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Không huỷ được đặt bàn.");
            setLoading(false);
        }
    }

    if (confirming) {
        return (
            <span className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-muted">Huỷ đặt bàn này?</span>
                <button type="button" onClick={handleCancel} disabled={loading} className="font-bold text-pink disabled:opacity-50">
                    {loading ? "Đang huỷ..." : "Xác nhận"}
                </button>
                <button type="button" onClick={() => setConfirming(false)} className="text-muted">
                    Thôi
                </button>
                {error && <span className="text-pink">{error}</span>}
            </span>
        );
    }

    return (
        <button
            type="button"
            onClick={() => setConfirming(true)}
            className="text-xs font-semibold text-muted transition-colors hover:text-pink"
        >
            Huỷ đặt bàn
        </button>
    );
}
