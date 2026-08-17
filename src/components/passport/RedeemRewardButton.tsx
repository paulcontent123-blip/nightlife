"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { clientFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/envelope";
import type { PassportRedeemResult, PassportReward } from "@/lib/api/types";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";

export function RedeemRewardButton({ reward, redeemable }: { reward: PassportReward; redeemable: boolean }) {
    const router = useRouter();
    const [confirming, setConfirming] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<PassportRedeemResult | null>(null);

    async function handleRedeem() {
        setLoading(true);
        setError(null);

        try {
            const data = await clientFetch<PassportRedeemResult>("/api/v1/passport/redeem", {
                method: "POST",
                body: JSON.stringify({ reward_id: reward.id }),
            });

            setResult(data);
            router.refresh();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Không đổi được phần thưởng này.");
        } finally {
            setLoading(false);
        }
    }

    if (result) {
        return (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs text-emerald-400">
                ✓ Đã đổi thành công. {result.fulfillment.note}
            </div>
        );
    }

    if (!redeemable) {
        return (
            <Button type="button" variant="secondary" disabled className="w-full">
                Chưa đủ điểm
            </Button>
        );
    }

    if (confirming) {
        return (
            <div className="flex flex-col gap-2">
                {error && <Alert>{error}</Alert>}
                <div className="flex gap-2">
                    <Button type="button" onClick={handleRedeem} disabled={loading} className="flex-1">
                        {loading ? <Spinner /> : "Xác nhận đổi"}
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => setConfirming(false)} disabled={loading}>
                        Thôi
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <Button type="button" onClick={() => setConfirming(true)} className="w-full">
            Đổi {reward.points} điểm
        </Button>
    );
}
