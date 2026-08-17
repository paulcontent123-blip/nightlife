"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { clientFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/envelope";
import type { Booking } from "@/lib/api/types";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";

export function BookingActionButtons({ booking }: { booking: Booking }) {
    const router = useRouter();
    const [loading, setLoading] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function runAction(action: string, path: string) {
        setLoading(action);
        setError(null);

        try {
            await clientFetch(path, { method: "POST" });
            router.refresh();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Thao tác thất bại.");
        } finally {
            setLoading(null);
        }
    }

    const depositBlocksConfirm = booking.deposit.amount > 0 && !booking.deposit.paid;

    return (
        <div className="flex flex-col gap-3">
            {error && <Alert>{error}</Alert>}

            <div className="flex flex-wrap gap-2">
                {booking.status === "pending" && (
                    <>
                        <Button
                            type="button"
                            disabled={loading !== null || depositBlocksConfirm}
                            onClick={() => runAction("confirm", `/api/v1/admin/bookings/${booking.id}/confirm`)}
                        >
                            {loading === "confirm" ? <Spinner /> : "✓ Xác nhận đặt bàn"}
                        </Button>
                        {depositBlocksConfirm && (
                            <span className="flex items-center text-xs text-muted">Chưa thể xác nhận: đặt cọc chưa được thanh toán.</span>
                        )}
                    </>
                )}

                {booking.status === "confirmed" && (
                    <Button
                        type="button"
                        disabled={loading !== null}
                        onClick={() => runAction("checkin", `/api/v1/bookings/${booking.id}/checkin`)}
                    >
                        {loading === "checkin" ? <Spinner /> : "🪑 Check-in"}
                    </Button>
                )}

                {booking.status === "seated" && (
                    <Button
                        type="button"
                        disabled={loading !== null}
                        onClick={() => runAction("complete", `/api/v1/admin/bookings/${booking.id}/complete`)}
                    >
                        {loading === "complete" ? <Spinner /> : "🏁 Hoàn tất"}
                    </Button>
                )}

                {["completed", "cancelled", "no_show"].includes(booking.status) && (
                    <p className="text-sm text-muted">Không còn thao tác khả dụng cho trạng thái này.</p>
                )}
            </div>
        </div>
    );
}
