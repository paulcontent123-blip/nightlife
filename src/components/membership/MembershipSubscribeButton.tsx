"use client";

import { useState } from "react";
import { clientFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/envelope";
import type { PaidMembershipTierKey, SubscribeMembershipResult } from "@/lib/api/types";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";

export function MembershipSubscribeButton({
    tier,
    disabledReason,
}: {
    tier: PaidMembershipTierKey;
    disabledReason?: string;
}) {
    const [expanded, setExpanded] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<"vnpay" | "momo">("vnpay");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubscribe() {
        setLoading(true);
        setError(null);

        try {
            const result = await clientFetch<SubscribeMembershipResult>("/api/v1/membership/subscribe", {
                method: "POST",
                body: JSON.stringify({ tier, payment_method: paymentMethod }),
            });

            window.location.href = result.payment.payment_url;
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Không thể đăng ký gói này, vui lòng thử lại.");
            setLoading(false);
        }
    }

    if (disabledReason) {
        return (
            <div className="rounded-lg border-[1.5px] border-border-strong py-2.5 text-center text-xs text-muted" title={disabledReason}>
                {disabledReason}
            </div>
        );
    }

    if (!expanded) {
        return (
            <Button type="button" onClick={() => setExpanded(true)} className="w-full">
                Đăng ký
            </Button>
        );
    }

    return (
        <div className="flex flex-col gap-2.5">
            <Select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as typeof paymentMethod)}>
                <option value="vnpay">VNPay</option>
                <option value="momo">MoMo</option>
            </Select>
            {error && <Alert>{error}</Alert>}
            <Button type="button" onClick={handleSubscribe} disabled={loading} className="w-full">
                {loading ? <Spinner /> : "Xác nhận đăng ký"}
            </Button>
        </div>
    );
}
