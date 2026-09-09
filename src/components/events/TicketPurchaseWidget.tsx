"use client";

import { useEffect, useState, type FormEvent } from "react";
import { clientFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/envelope";
import type { PurchaseTicketsResult, TicketTier } from "@/lib/api/types";
import { Button } from "@/components/ui/Button";
import { FieldGroup, Select } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";
import { formatVnd } from "@/lib/format";

const PAYMENT_METHODS: Array<{ value: "vnpay" | "momo"; label: string }> = [
    { value: "vnpay", label: "VNPay" },
    { value: "momo", label: "MoMo" },
];

export function TicketPurchaseWidget({ slug, initialTiers }: { slug: string; initialTiers?: TicketTier[] }) {
    const [tiers, setTiers] = useState<TicketTier[] | null>(initialTiers ?? null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [selectedTierId, setSelectedTierId] = useState<string | null>(
        initialTiers?.find((tier) => tier.available > 0)?.id ?? initialTiers?.[0]?.id ?? null
    );
    const [quantity, setQuantity] = useState(1);
    const [paymentMethod, setPaymentMethod] = useState<"vnpay" | "momo">("vnpay");
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [requiresLogin, setRequiresLogin] = useState(false);

    useEffect(() => {
        if (initialTiers !== undefined) {
            return;
        }

        let cancelled = false;

        clientFetch<{ items: TicketTier[] }>(`/api/v1/events/${slug}/ticket-tiers`)
            .then((result) => {
                if (cancelled) return;
                setTiers(result.items);
                setSelectedTierId(result.items.find((tier) => tier.available > 0)?.id ?? result.items[0]?.id ?? null);
            })
            .catch((error) => {
                if (cancelled) return;
                setLoadError(error instanceof ApiError ? error.message : "Không tải được thông tin vé.");
            });

        return () => {
            cancelled = true;
        };
    }, [slug, initialTiers]);

    const selectedTier = tiers?.find((tier) => tier.id === selectedTierId) ?? null;

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();

        if (!selectedTier) {
            return;
        }

        setSubmitting(true);
        setSubmitError(null);
        setRequiresLogin(false);

        try {
            const result = await clientFetch<PurchaseTicketsResult>(`/api/v1/events/${slug}/purchase`, {
                method: "POST",
                body: JSON.stringify({
                    tier_id: selectedTier.id,
                    quantity,
                    payment_method: paymentMethod,
                }),
            });

            window.location.href = result.payment.payment_url;
        } catch (error) {
            if (error instanceof ApiError && error.status === 401) {
                setRequiresLogin(true);
            } else {
                setSubmitError(error instanceof ApiError ? error.message : "Không thể mua vé, vui lòng thử lại.");
            }
        } finally {
            setSubmitting(false);
        }
    }

    if (loadError) {
        return (
            <div className="rounded-[18px] border border-border bg-void-2 p-6">
                <Alert>{loadError}</Alert>
            </div>
        );
    }

    if (!tiers) {
        return (
            <div className="flex items-center justify-center rounded-[18px] border border-border bg-void-2 p-10">
                <Spinner />
            </div>
        );
    }

    if (tiers.length === 0) {
        return (
            <div className="rounded-[18px] border border-border bg-void-2 p-6 text-sm text-muted">
                Sự kiện này chưa mở bán vé.
            </div>
        );
    }

    return (
        <div className="sticky top-24 rounded-[18px] border border-border bg-void-2 p-6 shadow-[0_12px_52px_rgba(0,0,0,.6)]">
            <div className="mb-4 h-[2px] w-full bg-gradient-to-r from-amber via-pink to-cyan" />
            <p className="font-display text-lg font-extrabold">Mua vé</p>
            <p className="mb-5 text-[13px] text-muted">Chọn loại vé và số lượng</p>

            <div className="flex flex-col gap-2">
                {tiers.map((tier) => (
                    <label
                        key={tier.id}
                        className={[
                            "flex cursor-pointer flex-col gap-1 rounded-lg border-[1.5px] px-3.5 py-3 text-sm transition-colors",
                            selectedTierId === tier.id ? "border-amber-border bg-amber-wash" : "border-border-strong hover:border-amber-border/60",
                            tier.available <= 0 ? "cursor-not-allowed opacity-40" : "",
                        ].join(" ")}
                    >
                        <span className="flex items-center justify-between">
                            <span className="flex items-center gap-2">
                                <input
                                    type="radio"
                                    name="tier"
                                    className="accent-amber"
                                    disabled={tier.available <= 0}
                                    checked={selectedTierId === tier.id}
                                    onChange={() => {
                                        setSelectedTierId(tier.id);
                                        setQuantity(1);
                                    }}
                                />
                                <span className="font-semibold text-white">{tier.name}</span>
                            </span>
                            <span className="font-display font-bold text-amber">{tier.price > 0 ? formatVnd(tier.price) : "Miễn phí"}</span>
                        </span>
                        {tier.includes.length > 0 && (
                            <span className="pl-6 text-xs text-muted">{tier.includes.join(" · ")}</span>
                        )}
                        <span className="pl-6 text-xs text-muted">
                            {tier.available > 0 ? `Còn ${tier.available} vé` : "Đã hết vé"}
                        </span>
                    </label>
                ))}
            </div>

            {selectedTier && selectedTier.available > 0 && (
                <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-3 border-t border-border pt-4">
                    <FieldGroup label="Số lượng">
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                                className="flex h-9 w-9 items-center justify-center rounded-lg border-[1.5px] border-border-strong text-white hover:border-amber"
                            >
                                −
                            </button>
                            <span className="w-8 text-center font-display text-base font-bold">{quantity}</span>
                            <button
                                type="button"
                                onClick={() => setQuantity((value) => Math.min(10, selectedTier.available, value + 1))}
                                className="flex h-9 w-9 items-center justify-center rounded-lg border-[1.5px] border-border-strong text-white hover:border-amber"
                            >
                                +
                            </button>
                        </div>
                    </FieldGroup>

                    <FieldGroup label="Hình thức thanh toán">
                        <Select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as typeof paymentMethod)}>
                            {PAYMENT_METHODS.map((method) => (
                                <option key={method.value} value={method.value}>
                                    {method.label}
                                </option>
                            ))}
                        </Select>
                    </FieldGroup>

                    <p className="text-sm text-white">
                        Tổng tiền: <span className="font-display font-bold text-amber">{formatVnd(selectedTier.price * quantity)}</span>
                    </p>

                    {requiresLogin && (
                        <Alert>
                            Vui lòng{" "}
                            <a href={`/login?next=/events/${slug}`} className="font-semibold underline">
                                đăng nhập
                            </a>{" "}
                            để mua vé.
                        </Alert>
                    )}
                    {submitError && <Alert>{submitError}</Alert>}

                    <Button type="submit" disabled={submitting} className="w-full">
                        {submitting ? <Spinner /> : "Mua vé"}
                    </Button>
                </form>
            )}
        </div>
    );
}
