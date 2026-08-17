"use client";

import { useState, type FormEvent } from "react";
import { clientFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/envelope";
import type { Paginated, VenueTable } from "@/lib/api/types";
import { Button } from "@/components/ui/Button";
import { FieldGroup, Input, Select } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";
import { formatVnd } from "@/lib/format";

const TABLE_TYPES = ["standard", "vip", "booth"];

interface NewTableForm {
    table_name: string;
    type: string;
    capacity: string;
    min_spend: string;
    deposit_required: string;
}

const EMPTY_FORM: NewTableForm = { table_name: "", type: "standard", capacity: "4", min_spend: "", deposit_required: "0" };

export function VenueTableManager({ venueId, initialTables }: { venueId: string; initialTables: VenueTable[] }) {
    const [tables, setTables] = useState(initialTables);
    const [form, setForm] = useState<NewTableForm>(EMPTY_FORM);
    const [showForm, setShowForm] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [busyId, setBusyId] = useState<string | null>(null);

    async function refresh() {
        const result = await clientFetch<Paginated<VenueTable>>(`/api/v1/admin/venues/${venueId}/tables?limit=100`);
        setTables(result.items);
    }

    async function handleCreate(event: FormEvent) {
        event.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await clientFetch(`/api/v1/admin/venues/${venueId}/tables`, {
                method: "POST",
                body: JSON.stringify({
                    table_name: form.table_name,
                    type: form.type,
                    capacity: Number(form.capacity),
                    min_spend: form.min_spend ? Number(form.min_spend) : undefined,
                    deposit_required: form.deposit_required ? Number(form.deposit_required) : 0,
                }),
            });
            await refresh();
            setForm(EMPTY_FORM);
            setShowForm(false);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Không tạo được bàn.");
        } finally {
            setLoading(false);
        }
    }

    async function toggleActive(table: VenueTable) {
        setBusyId(table.id);
        setError(null);

        try {
            await clientFetch(`/api/v1/admin/venues/${venueId}/tables/${table.id}`, {
                method: "PATCH",
                body: JSON.stringify({ is_active: !table.is_active }),
            });
            await refresh();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Không cập nhật được bàn.");
        } finally {
            setBusyId(null);
        }
    }

    async function removeTable(table: VenueTable) {
        setBusyId(table.id);
        setError(null);

        try {
            await clientFetch(`/api/v1/admin/venues/${venueId}/tables/${table.id}`, { method: "DELETE" });
            await refresh();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Không xoá được bàn.");
        } finally {
            setBusyId(null);
        }
    }

    return (
        <div className="flex flex-col gap-3">
            {error && <Alert>{error}</Alert>}

            {tables.length === 0 ? (
                <p className="text-sm text-muted">Chưa có bàn nào.</p>
            ) : (
                <div className="flex flex-col gap-2">
                    {tables.map((table) => (
                        <div key={table.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border-strong bg-void-3 px-3.5 py-2.5 text-sm">
                            <div>
                                <span className="font-semibold text-white">{table.table_name}</span>
                                <span className="ml-2 text-xs text-muted">
                                    {table.type} · {table.capacity} khách ·{" "}
                                    {table.deposit_required > 0 ? `Cọc ${formatVnd(table.deposit_required)}` : "Không cọc"}
                                </span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className={table.is_active ? "text-xs font-semibold text-emerald-400" : "text-xs font-semibold text-muted"}>
                                    {table.is_active ? "Hoạt động" : "Ngừng"}
                                </span>
                                <button
                                    type="button"
                                    disabled={busyId === table.id}
                                    onClick={() => toggleActive(table)}
                                    className="text-xs font-semibold text-amber hover:underline disabled:opacity-50"
                                >
                                    {table.is_active ? "Tạm ngừng" : "Kích hoạt"}
                                </button>
                                <button
                                    type="button"
                                    disabled={busyId === table.id}
                                    onClick={() => removeTable(table)}
                                    className="text-xs font-semibold text-pink hover:underline disabled:opacity-50"
                                >
                                    Xoá
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showForm ? (
                <form onSubmit={handleCreate} className="flex flex-col gap-3 rounded-lg border border-border-strong bg-void-3 p-4">
                    <div className="grid grid-cols-2 gap-3">
                        <FieldGroup label="Tên bàn">
                            <Input required value={form.table_name} onChange={(event) => setForm({ ...form, table_name: event.target.value })} />
                        </FieldGroup>
                        <FieldGroup label="Loại">
                            <Select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>
                                {TABLE_TYPES.map((type) => (
                                    <option key={type} value={type}>
                                        {type}
                                    </option>
                                ))}
                            </Select>
                        </FieldGroup>
                        <FieldGroup label="Sức chứa">
                            <Input type="number" min={1} required value={form.capacity} onChange={(event) => setForm({ ...form, capacity: event.target.value })} />
                        </FieldGroup>
                        <FieldGroup label="Chi tiêu tối thiểu">
                            <Input type="number" min={0} value={form.min_spend} onChange={(event) => setForm({ ...form, min_spend: event.target.value })} />
                        </FieldGroup>
                        <FieldGroup label="Tiền cọc">
                            <Input type="number" min={0} value={form.deposit_required} onChange={(event) => setForm({ ...form, deposit_required: event.target.value })} />
                        </FieldGroup>
                    </div>
                    <div className="flex gap-2">
                        <Button type="submit" size="sm" disabled={loading}>
                            {loading ? "Đang lưu..." : "Thêm bàn"}
                        </Button>
                        <Button type="button" size="sm" variant="secondary" onClick={() => setShowForm(false)}>
                            Huỷ
                        </Button>
                    </div>
                </form>
            ) : (
                <Button type="button" variant="secondary" size="sm" onClick={() => setShowForm(true)} className="self-start">
                    + Thêm bàn
                </Button>
            )}
        </div>
    );
}
