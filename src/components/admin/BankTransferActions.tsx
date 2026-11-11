"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { clientFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/envelope";
import type { BankTransferPurpose } from "@/lib/api/types";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";

const REJECT_HINT: Record<BankTransferPurpose, string> = {
    booking: "Đặt bàn quay lại trạng thái chờ chuyển khoản.",
    ticket_order: "Đơn vé bị huỷ và vé được nhả lại.",
    membership: "Đăng ký quay lại trạng thái chờ chuyển khoản.",
};

export function BankTransferActions({
    purpose,
    id,
    paymentRef,
    amountLabel,
}: {
    purpose: BankTransferPurpose;
    id: string;
    paymentRef: string | null;
    amountLabel: string;
}) {
    const router = useRouter();
    const [loading, setLoading] = useState<"verify" | "reject" | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function runAction(action: "verify" | "reject") {
        const question = action === "verify"
            ? `Xác nhận đã thấy giao dịch ${amountLabel} với nội dung ${paymentRef ?? ""} trên sao kê?`
            : `Không tìm thấy giao dịch ${paymentRef ?? ""}? ${REJECT_HINT[purpose]}`;

        if (!window.confirm(question)) {
            return;
        }

        setLoading(action);
        setError(null);

        try {
            await clientFetch(`/api/v1/admin/bank-transfers/${action}`, {
                method: "POST",
                body: JSON.stringify({ purpose, id }),
            });
            router.refresh();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Thao tác thất bại.");
        } finally {
            setLoading(null);
        }
    }

    return (
        <div className="flex flex-col items-end gap-1">
            <div className="flex gap-2">
                <Button type="button" size="sm" disabled={loading !== null} onClick={() => runAction("verify")}>
                    {loading === "verify" ? <Spinner /> : "Đã nhận tiền"}
                </Button>
                <Button type="button" size="sm" variant="danger" disabled={loading !== null} onClick={() => runAction("reject")}>
                    {loading === "reject" ? <Spinner /> : "Không thấy"}
                </Button>
            </div>
            {error && <div className="max-w-60"><Alert>{error}</Alert></div>}
        </div>
    );
}
