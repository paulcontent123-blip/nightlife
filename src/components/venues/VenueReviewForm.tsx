"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { clientFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/envelope";
import type { EligibleReviewBooking } from "@/lib/api/types";
import { Button } from "@/components/ui/Button";
import { FieldGroup, Select, Textarea } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";
import { formatDate, formatTime } from "@/lib/format";

const RATING_FIELDS = [
    { key: "atmosphere_rating", label: "Không gian" },
    { key: "service_rating", label: "Phục vụ" },
    { key: "value_rating", label: "Đáng tiền" },
] as const;

export function VenueReviewForm({ slug, bookings }: { slug: string; bookings: EligibleReviewBooking[] }) {
    const router = useRouter();
    const [expanded, setExpanded] = useState(false);
    const [bookingId, setBookingId] = useState(bookings[0]?.id ?? "");
    const [rating, setRating] = useState(5);
    const [atmosphereRating, setAtmosphereRating] = useState("");
    const [serviceRating, setServiceRating] = useState("");
    const [valueRating, setValueRating] = useState("");
    const [content, setContent] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState(false);

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await clientFetch(`/api/v1/venues/${slug}/reviews`, {
                method: "POST",
                body: JSON.stringify({
                    booking_id: bookingId,
                    rating,
                    atmosphere_rating: atmosphereRating ? Number(atmosphereRating) : undefined,
                    service_rating: serviceRating ? Number(serviceRating) : undefined,
                    value_rating: valueRating ? Number(valueRating) : undefined,
                    content: content || undefined,
                }),
            });

            setDone(true);
            router.refresh();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Không đăng được đánh giá, vui lòng thử lại.");
        } finally {
            setLoading(false);
        }
    }

    if (done) {
        return <Alert tone="success">Cảm ơn bạn đã đánh giá! Đánh giá của bạn đã được ghi nhận.</Alert>;
    }

    if (!expanded) {
        return (
            <button
                type="button"
                onClick={() => setExpanded(true)}
                className="w-full rounded-xl border-[1.5px] border-dashed border-border-heavy p-4 text-left text-sm text-muted transition-colors hover:border-amber hover:text-amber"
            >
                + Viết đánh giá cho venue này
            </button>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-xl border border-border bg-void-2 p-5">
            {bookings.length > 1 && (
                <FieldGroup label="Lượt ghé thăm">
                    <Select value={bookingId} onChange={(event) => setBookingId(event.target.value)}>
                        {bookings.map((booking) => (
                            <option key={booking.id} value={booking.id}>
                                {formatDate(booking.booking_date)} · {formatTime(booking.booking_time)}
                            </option>
                        ))}
                    </Select>
                </FieldGroup>
            )}

            <FieldGroup label="Đánh giá tổng thể">
                <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((value) => (
                        <button
                            key={value}
                            type="button"
                            onClick={() => setRating(value)}
                            className={["text-2xl transition-opacity", value <= rating ? "opacity-100" : "opacity-25"].join(" ")}
                            aria-label={`${value} sao`}
                        >
                            ⭐
                        </button>
                    ))}
                </div>
            </FieldGroup>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {RATING_FIELDS.map((field) => (
                    <FieldGroup key={field.key} label={`${field.label} (không bắt buộc)`}>
                        <Select
                            value={field.key === "atmosphere_rating" ? atmosphereRating : field.key === "service_rating" ? serviceRating : valueRating}
                            onChange={(event) => {
                                const setter = field.key === "atmosphere_rating" ? setAtmosphereRating : field.key === "service_rating" ? setServiceRating : setValueRating;
                                setter(event.target.value);
                            }}
                        >
                            <option value="">—</option>
                            {[1, 2, 3, 4, 5].map((value) => (
                                <option key={value} value={value}>
                                    {value} sao
                                </option>
                            ))}
                        </Select>
                    </FieldGroup>
                ))}
            </div>

            <FieldGroup label="Nhận xét (không bắt buộc)">
                <Textarea
                    maxLength={3000}
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    placeholder="Không gian, giá cả, phục vụ thế nào?"
                />
            </FieldGroup>

            {error && <Alert>{error}</Alert>}

            <div className="flex gap-2">
                <Button type="submit" disabled={loading}>
                    {loading ? "Đang đăng..." : "Đăng đánh giá"}
                </Button>
                <Button type="button" variant="secondary" onClick={() => setExpanded(false)}>
                    Huỷ
                </Button>
            </div>
        </form>
    );
}
