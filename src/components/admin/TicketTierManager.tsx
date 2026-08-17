"use client";

import { useState, type FormEvent } from "react";
import { clientFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/envelope";
import type { TicketTier } from "@/lib/api/types";
import { Button } from "@/components/ui/Button";
import { FieldGroup, Input } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";
import { formatVnd } from "@/lib/format";

interface NewTierForm {
    name: string;
    price: string;
    quantity: string;
    includes: string;
}

const EMPTY_FORM: NewTierForm = { name: "", price: "0", quantity: "50", includes: "" };

export function TicketTierManager({ eventId, initialTiers }: { eventId: string; initialTiers: TicketTier[] }) {
    const [tiers, setTiers] = useState(initialTiers);
    const [form, setForm] = useState<NewTierForm>(EMPTY_FORM);
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function refresh() {
        const result = await clientFetch<{ items: TicketTier[] }>(`/api/v1/admin/events/${eventId}/ticket-tiers`);
        setTiers(result.items);
    }

    async function handleCreate(event: FormEvent) {
        event.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await clientFetch(`/api/v1/admin/events/${eventId}/ticket-tiers`, {
                method: "POST",
                body: JSON.stringify({
                    name: form.name,
                    price: Number(form.price || 0),
                    quantity: Number(form.quantity || 0),
                    includes: form.includes.split(",").map((v) => v.trim()).filter(Boolean),
                }),
            });
            await refresh();
            setForm(EMPTY_FORM);
            setShowForm(false);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Không tạo được loại vé.");
        } finally {
            setLoading(false);
        }
    }

    async function removeTier(tier: TicketTier) {
        setBusyId(tier.id);
        setError(null);

        try {
            await clientFetch(`/api/v1/admin/ticket-tiers/${tier.id}`, { method: "DELETE" });
            await refresh();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Không xoá được loại vé (có thể đã có vé được bán).");
        } finally {
            setBusyId(null);
        }
    }

    return (
        <div className="flex flex-col gap-3">
            {error && <Alert>{error}</Alert>}

            {tiers.length === 0 ? (
                <p className="text-sm text-muted">Chưa có loại vé nào.</p>
            ) : (
                <div className="flex flex-col gap-2">
                    {tiers.map((tier) => (
                        <div key={tier.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border-strong bg-void-3 px-3.5 py-2.5 text-sm">
                            <div>
                                <span className="font-semibold text-white">{tier.name}</span>
                                <span className="ml-2 text-xs text-muted">
                                    {formatVnd(tier.price)} · Đã bán {tier.sold}/{tier.quantity}
                                </span>
                            </div>
                            <button
                                type="button"
                                disabled={busyId === tier.id || tier.sold > 0}
                                onClick={() => removeTier(tier)}
                                title={tier.sold > 0 ? "Không thể xoá loại vé đã có người mua" : undefined}
                                className="text-xs font-semibold text-pink hover:underline disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                Xoá
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {showForm ? (
                <form onSubmit={handleCreate} className="flex flex-col gap-3 rounded-lg border border-border-strong bg-void-3 p-4">
                    <FieldGroup label="Tên loại vé">
                        <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Early Bird" />
                    </FieldGroup>
                    <div className="grid grid-cols-2 gap-3">
                        <FieldGroup label="Giá (VND)">
                            <Input type="number" min={0} required value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                        </FieldGroup>
                        <FieldGroup label="Số lượng">
                            <Input type="number" min={1} required value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
                        </FieldGroup>
                    </div>
                    <FieldGroup label="Bao gồm (cách nhau bằng dấu phẩy)">
                        <Input value={form.includes} onChange={(e) => setForm({ ...form, includes: e.target.value })} placeholder="1 welcome drink, priority entry" />
                    </FieldGroup>
                    <div className="flex gap-2">
                        <Button type="submit" size="sm" disabled={loading}>
                            {loading ? "Đang lưu..." : "Thêm loại vé"}
                        </Button>
                        <Button type="button" size="sm" variant="secondary" onClick={() => setShowForm(false)}>
                            Huỷ
                        </Button>
                    </div>
                </form>
            ) : (
                <Button type="button" variant="secondary" size="sm" onClick={() => setShowForm(true)} className="self-start">
                    + Thêm loại vé
                </Button>
            )}
        </div>
    );
}
