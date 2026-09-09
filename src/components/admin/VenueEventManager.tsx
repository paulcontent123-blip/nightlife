"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { clientFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/envelope";
import type { Event, Paginated } from "@/lib/api/types";
import { Button } from "@/components/ui/Button";
import { FieldGroup, Input } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";
import { formatDate, formatTime } from "@/lib/format";

interface NewEventForm {
    title: string;
    event_date: string;
    start_time: string;
}

const EMPTY_FORM: NewEventForm = { title: "", event_date: "", start_time: "21:00" };

export function VenueEventManager({ venueId, initialEvents }: { venueId: string; initialEvents: Event[] }) {
    const [events, setEvents] = useState(initialEvents);
    const [form, setForm] = useState<NewEventForm>(EMPTY_FORM);
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function refresh() {
        const result = await clientFetch<Paginated<Event>>(`/api/v1/admin/venues/${venueId}/events?limit=100`);
        setEvents(result.items);
    }

    async function handleCreate(event: FormEvent) {
        event.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await clientFetch(`/api/v1/admin/venues/${venueId}/events`, {
                method: "POST",
                body: JSON.stringify({
                    title: form.title,
                    event_date: form.event_date,
                    start_time: form.start_time,
                }),
            });
            await refresh();
            setForm(EMPTY_FORM);
            setShowForm(false);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Không tạo được sự kiện.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="flex flex-col gap-3">
            {error && <Alert>{error}</Alert>}

            {events.length === 0 ? (
                <p className="text-sm text-muted">Venue chưa có sự kiện nào.</p>
            ) : (
                <div className="flex flex-col gap-2">
                    {events.map((item) => (
                        <Link
                            key={item.id}
                            href={`/admin/venues/${venueId}/events/${item.id}`}
                            prefetch={false}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border-strong bg-void-3 px-3.5 py-2.5 text-sm transition-colors hover:border-amber-border"
                        >
                            <span>
                                <span className="font-semibold text-white">{item.title}</span>
                                <span className="ml-2 text-xs text-muted">
                                    {formatDate(item.event_date)} · {formatTime(item.start_time)}
                                </span>
                            </span>
                            <span className={item.is_active ? "text-xs font-semibold text-emerald-400" : "text-xs font-semibold text-muted"}>
                                {item.is_active ? "Đang hoạt động" : "Ngừng"}
                            </span>
                        </Link>
                    ))}
                </div>
            )}

            {showForm ? (
                <form onSubmit={handleCreate} className="flex flex-col gap-3 rounded-lg border border-border-strong bg-void-3 p-4">
                    <FieldGroup label="Tên sự kiện">
                        <Input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
                    </FieldGroup>
                    <div className="grid grid-cols-2 gap-3">
                        <FieldGroup label="Ngày">
                            <Input type="date" required value={form.event_date} onChange={(event) => setForm({ ...form, event_date: event.target.value })} />
                        </FieldGroup>
                        <FieldGroup label="Giờ bắt đầu">
                            <Input type="time" required value={form.start_time} onChange={(event) => setForm({ ...form, start_time: event.target.value })} />
                        </FieldGroup>
                    </div>
                    <p className="text-xs text-muted">Có thể chỉnh mô tả, line-up, ảnh và vé sau khi tạo.</p>
                    <div className="flex gap-2">
                        <Button type="submit" size="sm" disabled={loading}>
                            {loading ? "Đang lưu..." : "Tạo sự kiện"}
                        </Button>
                        <Button type="button" size="sm" variant="secondary" onClick={() => setShowForm(false)}>
                            Huỷ
                        </Button>
                    </div>
                </form>
            ) : (
                <Button type="button" variant="secondary" size="sm" onClick={() => setShowForm(true)} className="self-start">
                    + Thêm sự kiện
                </Button>
            )}
        </div>
    );
}
