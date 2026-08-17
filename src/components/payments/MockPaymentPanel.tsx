"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { clientFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/envelope";
import type { PaymentIpnResult, TicketOrderPaymentResult } from "@/lib/api/types";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";
import { formatVnd } from "@/lib/format";

type Purpose = "booking" | "ticket_order" | "membership";

export function MockPaymentPanel() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const provider = searchParams.get("provider") ?? "vnpay";
    const bookingId = searchParams.get("booking_id") ?? "";
    const membershipSubscriptionId = searchParams.get("membership_subscription_id") ?? "";
    const tier = searchParams.get("tier") ?? "";
    const paymentRef = searchParams.get("payment_ref") ?? "";
    const amount = Number(searchParams.get("amount") ?? "0");
    const rawPurpose = searchParams.get("purpose");
    const purpose: Purpose = rawPurpose === "ticket_order" || rawPurpose === "membership" ? rawPurpose : "booking";

    const [submitting, setSubmitting] = useState<"success" | "failed" | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function handleResult(status: "success" | "failed") {
        setSubmitting(status);
        setError(null);

        try {
            if (purpose === "ticket_order") {
                const result = await clientFetch<TicketOrderPaymentResult>(`/api/v1/payments/${provider}/ipn`, {
                    method: "POST",
                    body: JSON.stringify({
                        payment_ref: paymentRef,
                        status,
                        amount,
                        transaction_id: `SIM_${Date.now()}`,
                        purpose: "ticket_order",
                    }),
                });

                router.push(`/tickets/mine?order=${result.order?.id ?? ""}&payment=${status}`);

                return;
            }

            if (purpose === "membership") {
                await clientFetch(`/api/v1/payments/${provider}/ipn`, {
                    method: "POST",
                    body: JSON.stringify({
                        payment_ref: paymentRef,
                        status,
                        amount,
                        transaction_id: `SIM_${Date.now()}`,
                        purpose: "membership",
                        membership_subscription_id: membershipSubscriptionId,
                    }),
                });

                router.push(`/membership?payment=${status}`);

                return;
            }

            await clientFetch<PaymentIpnResult>(`/api/v1/payments/${provider}/ipn`, {
                method: "POST",
                body: JSON.stringify({
                    booking_id: bookingId,
                    payment_ref: paymentRef,
                    status,
                    amount,
                    transaction_id: `SIM_${Date.now()}`,
                }),
            });

            router.push(`/bookings/${bookingId}?payment=${status}`);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Không xử lý được giao dịch mô phỏng.");
            setSubmitting(null);
        }
    }

    if (!paymentRef || (purpose === "booking" && !bookingId)) {
        return <Alert>Thiếu thông tin giao dịch. Vui lòng quay lại luồng thanh toán.</Alert>;
    }

    return (
        <div className="rounded-2xl border border-border bg-void-2 p-7 shadow-[0_12px_52px_rgba(0,0,0,.6)]">
            <p className="mb-1 font-display text-[11px] font-bold uppercase tracking-widest text-amber">
                Mô phỏng cổng thanh toán
            </p>
            <p className="mb-5 font-display text-2xl font-extrabold uppercase">{provider}</p>

            <div className="mb-6 flex flex-col gap-2 rounded-lg border border-border-strong bg-void-3 p-4 text-sm">
                <Row label="Số tiền" value={formatVnd(amount)} />
                <Row label="Mã giao dịch" value={paymentRef} mono />
                {purpose === "booking" && <Row label="Mã đặt bàn" value={bookingId} mono />}
                {purpose === "ticket_order" && <Row label="Loại giao dịch" value="Mua vé sự kiện" />}
                {purpose === "membership" && <Row label="Gói thành viên" value={tier || "—"} />}
            </div>

            <p className="mb-5 text-xs leading-relaxed text-muted">
                Đây là màn hình giả lập vì Nightlife.vn hiện chưa tích hợp cổng thanh toán thật. Chọn kết quả bên
                dưới để tiếp tục.
            </p>

            {error && <div className="mb-4"><Alert>{error}</Alert></div>}

            <div className="flex flex-col gap-2.5 sm:flex-row">
                <Button
                    type="button"
                    onClick={() => handleResult("success")}
                    disabled={submitting !== null}
                    className="w-full sm:flex-1"
                >
                    {submitting === "success" ? <Spinner /> : "✓ Thanh toán thành công"}
                </Button>
                <Button
                    type="button"
                    variant="danger"
                    onClick={() => handleResult("failed")}
                    disabled={submitting !== null}
                    className="w-full sm:flex-1"
                >
                    {submitting === "failed" ? <Spinner /> : "✕ Giao dịch thất bại"}
                </Button>
            </div>
        </div>
    );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
    return (
        <div className="flex items-center justify-between gap-3">
            <span className="text-muted">{label}</span>
            <span className={["truncate text-white", mono ? "font-mono text-xs" : "font-semibold"].join(" ")}>{value}</span>
        </div>
    );
}
