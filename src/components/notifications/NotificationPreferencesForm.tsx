"use client";

import { useState, type FormEvent } from "react";
import { clientFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/envelope";
import type { NotificationPreference } from "@/lib/api/types";
import { Button } from "@/components/ui/Button";
import { FieldGroup, Input, Select } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";
import { CITY_LABEL } from "@/lib/format";

export function NotificationPreferencesForm({ preference }: { preference: NotificationPreference }) {
    const [enabled, setEnabled] = useState(preference.happy_hour_push_enabled);
    const [city, setCity] = useState(preference.happy_hour_city ?? "");
    const [district, setDistrict] = useState(preference.happy_hour_district ?? "");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();
        setLoading(true);
        setError(null);
        setSaved(false);

        try {
            await clientFetch("/api/v1/notifications/preferences", {
                method: "PUT",
                body: JSON.stringify({
                    happy_hour_push_enabled: enabled,
                    happy_hour_city: city || null,
                    happy_hour_district: district || null,
                }),
            });
            setSaved(true);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Không lưu được cài đặt, vui lòng thử lại.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-xl border border-border bg-void-2 p-5">
            <p className="font-display text-sm font-extrabold">🍹 Thông báo Happy Hour</p>

            <label className="flex items-center gap-2.5 text-sm text-white">
                <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(event) => setEnabled(event.target.checked)}
                    className="h-4 w-4 accent-amber"
                />
                Nhận thông báo deal Happy Hour gần tôi
            </label>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FieldGroup label="Thành phố">
                    <Select value={city} onChange={(event) => setCity(event.target.value)}>
                        <option value="">Tất cả thành phố</option>
                        {Object.entries(CITY_LABEL).map(([value, label]) => (
                            <option key={value} value={value}>
                                {label}
                            </option>
                        ))}
                    </Select>
                </FieldGroup>
                <FieldGroup label="Quận (không bắt buộc)">
                    <Input value={district} onChange={(event) => setDistrict(event.target.value)} placeholder="Quận 1" />
                </FieldGroup>
            </div>

            {saved && <Alert tone="success">Đã lưu cài đặt thông báo.</Alert>}
            {error && <Alert>{error}</Alert>}

            <Button type="submit" disabled={loading} className="self-start">
                {loading ? "Đang lưu..." : "Lưu cài đặt"}
            </Button>
        </form>
    );
}
