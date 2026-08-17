"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { clientFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/envelope";
import type { Event } from "@/lib/api/types";
import { Button } from "@/components/ui/Button";
import { FieldGroup, Input, Textarea } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";
import { formatTime } from "@/lib/format";

interface EventFormState {
    title: string;
    description: string;
    event_date: string;
    start_time: string;
    end_time: string;
    genre: string;
    lineup: string;
    is_free: boolean;
    age_restriction: string;
    total_capacity: string;
    is_active: boolean;
}

function toFormState(event: Event): EventFormState {
    return {
        title: event.title,
        description: event.description ?? "",
        event_date: event.event_date,
        start_time: formatTime(event.start_time),
        end_time: event.end_time ? formatTime(event.end_time) : "",
        genre: event.genre.join(", "),
        lineup: event.lineup.join(", "),
        is_free: event.is_free,
        age_restriction: String(event.age_restriction),
        total_capacity: event.total_capacity != null ? String(event.total_capacity) : "",
        is_active: event.is_active,
    };
}

export function EventForm({ venueId, event }: { venueId: string; event: Event }) {
    const router = useRouter();
    const [form, setForm] = useState<EventFormState>(toFormState(event));
    const [media, setMedia] = useState(event.media);
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    function update<K extends keyof EventFormState>(key: K, value: EventFormState[K]) {
        setForm((prev) => ({ ...prev, [key]: value }));
        setSaved(false);
    }

    function buildPayload() {
        return {
            title: form.title,
            description: form.description.trim() || null,
            event_date: form.event_date,
            start_time: form.start_time,
            end_time: form.end_time || null,
            genre: form.genre.split(",").map((v) => v.trim()).filter(Boolean),
            lineup: form.lineup.split(",").map((v) => v.trim()).filter(Boolean),
            is_free: form.is_free,
            age_restriction: Number(form.age_restriction || 18),
            total_capacity: form.total_capacity ? Number(form.total_capacity) : null,
            is_active: form.is_active,
        };
    }

    async function handleSubmit(formEvent: FormEvent) {
        formEvent.preventDefault();
        setLoading(true);
        setError(null);
        setSaved(false);

        try {
            await clientFetch(`/api/v1/admin/venues/${venueId}/events/${event.id}`, {
                method: "PATCH",
                body: JSON.stringify(buildPayload()),
            });
            setSaved(true);
            router.refresh();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Không lưu được sự kiện.");
        } finally {
            setLoading(false);
        }
    }

    async function handleUpload(files: FileList | null) {
        if (!files || files.length === 0) return;

        setUploading(true);
        setError(null);

        try {
            const formData = new FormData();

            formData.append("payload", JSON.stringify(buildPayload()));
            Array.from(files).forEach((file) => formData.append("images", file));
            formData.append("set_thumbnail", media.thumbnail_url ? "false" : "true");

            const updated = await clientFetch<{ event: Event }>(`/api/v1/admin/venues/${venueId}/events/${event.id}`, {
                method: "PATCH",
                body: formData,
            });
            setMedia(updated.event.media);
            router.refresh();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Không tải ảnh lên được.");
        } finally {
            setUploading(false);

            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    }

    return (
        <div className="flex flex-col gap-6">
            <section>
                <p className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-muted">Ảnh sự kiện</p>
                {media.images.length > 0 && (
                    <div className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                        {media.images.map((url) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img key={url} src={url} alt="" className="h-20 w-full rounded-lg border border-border-strong object-cover" />
                        ))}
                    </div>
                )}
                <label className="flex h-10 w-fit cursor-pointer items-center gap-2 rounded-lg border-[1.5px] border-dashed border-border-heavy px-4 text-xs font-semibold text-muted hover:border-amber hover:text-amber">
                    {uploading ? "Đang tải..." : "+ Tải ảnh lên"}
                    <input ref={fileInputRef} type="file" accept="image/*" multiple disabled={uploading} className="hidden" onChange={(e) => handleUpload(e.target.files)} />
                </label>
            </section>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <FieldGroup label="Tên sự kiện">
                    <Input required value={form.title} onChange={(e) => update("title", e.target.value)} />
                </FieldGroup>
                <FieldGroup label="Mô tả">
                    <Textarea value={form.description} onChange={(e) => update("description", e.target.value)} />
                </FieldGroup>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <FieldGroup label="Ngày">
                        <Input type="date" required value={form.event_date} onChange={(e) => update("event_date", e.target.value)} />
                    </FieldGroup>
                    <FieldGroup label="Giờ bắt đầu">
                        <Input type="time" required value={form.start_time} onChange={(e) => update("start_time", e.target.value)} />
                    </FieldGroup>
                    <FieldGroup label="Giờ kết thúc">
                        <Input type="time" value={form.end_time} onChange={(e) => update("end_time", e.target.value)} />
                    </FieldGroup>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <FieldGroup label="Thể loại (cách nhau bằng dấu phẩy)">
                        <Input value={form.genre} onChange={(e) => update("genre", e.target.value)} placeholder="edm, hip_hop" />
                    </FieldGroup>
                    <FieldGroup label="Line-up (cách nhau bằng dấu phẩy)">
                        <Input value={form.lineup} onChange={(e) => update("lineup", e.target.value)} placeholder="DJ Tiesto, Local DJ" />
                    </FieldGroup>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <FieldGroup label="Tuổi tối thiểu">
                        <Input type="number" min={18} max={99} value={form.age_restriction} onChange={(e) => update("age_restriction", e.target.value)} />
                    </FieldGroup>
                    <FieldGroup label="Sức chứa">
                        <Input type="number" min={0} value={form.total_capacity} onChange={(e) => update("total_capacity", e.target.value)} />
                    </FieldGroup>
                </div>
                <div className="flex flex-wrap gap-5">
                    <label className="flex items-center gap-2 text-sm text-white">
                        <input type="checkbox" className="accent-amber" checked={form.is_free} onChange={(e) => update("is_free", e.target.checked)} />
                        Miễn phí vào cửa
                    </label>
                    <label className="flex items-center gap-2 text-sm text-white">
                        <input type="checkbox" className="accent-amber" checked={form.is_active} onChange={(e) => update("is_active", e.target.checked)} />
                        Đang hoạt động
                    </label>
                </div>

                {error && <Alert>{error}</Alert>}
                {saved && <Alert tone="success">Đã lưu thay đổi.</Alert>}

                <div>
                    <Button type="submit" disabled={loading}>
                        {loading ? "Đang lưu..." : "Lưu thay đổi"}
                    </Button>
                </div>
            </form>
        </div>
    );
}
