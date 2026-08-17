"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { clientFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/envelope";
import type { CreateVenueDTO, UpdateVenueDTO, Venue } from "@/lib/api/types";
import { Button } from "@/components/ui/Button";
import { FieldGroup, Input, Select, Textarea } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";
import { VENUE_TYPE_LABEL } from "@/lib/format";

const VENUE_TYPES = Object.keys(VENUE_TYPE_LABEL);
const PRICE_RANGES = ["$", "$$", "$$$", "$$$$"];
const CITIES = [
    { value: "hcm", label: "TP.HCM" },
    { value: "hanoi", label: "Hà Nội" },
    { value: "danang", label: "Đà Nẵng" },
];

interface VenueFormState {
    name: string;
    type: string;
    description: string;
    phone: string;
    website: string;
    instagram: string;
    address: string;
    district: string;
    city: string;
    lat: string;
    lng: string;
    cover_charge: string;
    price_range: string;
    capacity: string;
    min_spend: string;
    dress_code: string;
    age_restriction: string;
    is_vip_only: boolean;
    subscription_tier: string;
    is_active: boolean;
    is_verified: boolean;
    features: string;
}

function toFormState(venue?: Venue): VenueFormState {
    return {
        name: venue?.name ?? "",
        type: venue?.type ?? "rooftop_bar",
        description: venue?.description ?? "",
        phone: venue?.contact.phone ?? "",
        website: venue?.contact.website ?? "",
        instagram: venue?.contact.instagram ?? "",
        address: venue?.address ?? "",
        district: venue?.district ?? "",
        city: venue?.city ?? "hcm",
        lat: venue?.location.lat != null ? String(venue.location.lat) : "10.7769",
        lng: venue?.location.lng != null ? String(venue.location.lng) : "106.7009",
        cover_charge: venue ? String(venue.pricing.cover_charge) : "0",
        price_range: venue?.pricing.price_range ?? "$$",
        capacity: venue?.pricing.capacity != null ? String(venue.pricing.capacity) : "",
        min_spend: venue?.pricing.min_spend != null ? String(venue.pricing.min_spend) : "",
        dress_code: venue?.pricing.dress_code ?? "",
        age_restriction: venue ? String(venue.pricing.age_restriction) : "18",
        is_vip_only: venue?.operations.is_vip_only ?? false,
        subscription_tier: venue?.operations.subscription_tier ?? "basic",
        is_active: venue?.status.is_active ?? true,
        is_verified: venue?.status.is_verified ?? true,
        features: venue?.features.join(", ") ?? "",
    };
}

export function VenueForm({ mode, venueId, initialVenue }: { mode: "create" | "edit"; venueId?: string; initialVenue?: Venue }) {
    const router = useRouter();
    const [form, setForm] = useState<VenueFormState>(toFormState(initialVenue));
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);
    const [loading, setLoading] = useState(false);

    function update<K extends keyof VenueFormState>(key: K, value: VenueFormState[K]) {
        setForm((prev) => ({ ...prev, [key]: value }));
        setSaved(false);
    }

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();
        setLoading(true);
        setError(null);
        setSaved(false);

        const body: CreateVenueDTO | UpdateVenueDTO = {
            basic: {
                name: form.name,
                type: form.type as CreateVenueDTO["basic"]["type"],
                description: form.description.trim() || undefined,
                phone: form.phone.trim() || undefined,
                website: form.website.trim() || undefined,
                instagram: form.instagram.trim() || undefined,
            },
            address: {
                address: form.address,
                district: form.district.trim() || undefined,
                city: form.city as NonNullable<CreateVenueDTO["address"]>["city"],
                lat: Number(form.lat),
                lng: Number(form.lng),
            },
            pricing: {
                cover_charge: Number(form.cover_charge || 0),
                price_range: form.price_range as NonNullable<CreateVenueDTO["pricing"]>["price_range"],
                capacity: form.capacity ? Number(form.capacity) : undefined,
                min_spend: form.min_spend ? Number(form.min_spend) : undefined,
                dress_code: form.dress_code.trim() || undefined,
                age_restriction: Number(form.age_restriction || 18),
            },
            operations: {
                is_vip_only: form.is_vip_only,
                subscription_tier: form.subscription_tier as NonNullable<CreateVenueDTO["operations"]>["subscription_tier"],
                ...(mode === "edit" ? { is_active: form.is_active, is_verified: form.is_verified } : {}),
            },
            features: form.features
                .split(",")
                .map((feature) => feature.trim())
                .filter(Boolean),
        };

        try {
            if (mode === "create") {
                const venue = await clientFetch<Venue>("/api/v1/admin/venues", {
                    method: "POST",
                    body: JSON.stringify(body),
                });

                router.push(`/admin/venues/${venue.id}`);
            } else {
                await clientFetch<Venue>(`/api/v1/admin/venues/${venueId}`, {
                    method: "PUT",
                    body: JSON.stringify(body),
                });
                setSaved(true);
                router.refresh();
            }
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Không lưu được venue.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <section className="flex flex-col gap-3">
                <p className="font-display text-sm font-bold uppercase tracking-wide text-muted">Thông tin cơ bản</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <FieldGroup label="Tên venue">
                        <Input required value={form.name} onChange={(event) => update("name", event.target.value)} />
                    </FieldGroup>
                    <FieldGroup label="Loại hình">
                        <Select value={form.type} onChange={(event) => update("type", event.target.value)}>
                            {VENUE_TYPES.map((type) => (
                                <option key={type} value={type}>
                                    {VENUE_TYPE_LABEL[type]}
                                </option>
                            ))}
                        </Select>
                    </FieldGroup>
                </div>
                <FieldGroup label="Mô tả">
                    <Textarea value={form.description} onChange={(event) => update("description", event.target.value)} />
                </FieldGroup>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <FieldGroup label="Điện thoại">
                        <Input value={form.phone} onChange={(event) => update("phone", event.target.value)} />
                    </FieldGroup>
                    <FieldGroup label="Website">
                        <Input value={form.website} onChange={(event) => update("website", event.target.value)} placeholder="https://..." />
                    </FieldGroup>
                    <FieldGroup label="Instagram">
                        <Input value={form.instagram} onChange={(event) => update("instagram", event.target.value)} />
                    </FieldGroup>
                </div>
            </section>

            <section className="flex flex-col gap-3">
                <p className="font-display text-sm font-bold uppercase tracking-wide text-muted">Địa chỉ</p>
                <FieldGroup label="Địa chỉ đầy đủ">
                    <Input required value={form.address} onChange={(event) => update("address", event.target.value)} />
                </FieldGroup>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <FieldGroup label="Quận/Khu vực">
                        <Input value={form.district} onChange={(event) => update("district", event.target.value)} />
                    </FieldGroup>
                    <FieldGroup label="Thành phố">
                        <Select value={form.city} onChange={(event) => update("city", event.target.value)}>
                            {CITIES.map((city) => (
                                <option key={city.value} value={city.value}>
                                    {city.label}
                                </option>
                            ))}
                        </Select>
                    </FieldGroup>
                    <FieldGroup label="Lat">
                        <Input type="number" step="any" required value={form.lat} onChange={(event) => update("lat", event.target.value)} />
                    </FieldGroup>
                    <FieldGroup label="Lng">
                        <Input type="number" step="any" required value={form.lng} onChange={(event) => update("lng", event.target.value)} />
                    </FieldGroup>
                </div>
            </section>

            <section className="flex flex-col gap-3">
                <p className="font-display text-sm font-bold uppercase tracking-wide text-muted">Giá & sức chứa</p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <FieldGroup label="Cover charge (VND)">
                        <Input type="number" min={0} value={form.cover_charge} onChange={(event) => update("cover_charge", event.target.value)} />
                    </FieldGroup>
                    <FieldGroup label="Mức giá">
                        <Select value={form.price_range} onChange={(event) => update("price_range", event.target.value)}>
                            {PRICE_RANGES.map((range) => (
                                <option key={range} value={range}>
                                    {range}
                                </option>
                            ))}
                        </Select>
                    </FieldGroup>
                    <FieldGroup label="Tuổi tối thiểu">
                        <Input type="number" min={18} max={99} value={form.age_restriction} onChange={(event) => update("age_restriction", event.target.value)} />
                    </FieldGroup>
                    <FieldGroup label="Sức chứa">
                        <Input type="number" min={0} value={form.capacity} onChange={(event) => update("capacity", event.target.value)} />
                    </FieldGroup>
                    <FieldGroup label="Chi tiêu tối thiểu">
                        <Input type="number" min={0} value={form.min_spend} onChange={(event) => update("min_spend", event.target.value)} />
                    </FieldGroup>
                    <FieldGroup label="Dress code">
                        <Input value={form.dress_code} onChange={(event) => update("dress_code", event.target.value)} />
                    </FieldGroup>
                </div>
            </section>

            <section className="flex flex-col gap-3">
                <p className="font-display text-sm font-bold uppercase tracking-wide text-muted">Khác</p>
                <FieldGroup label="Đặc điểm (cách nhau bằng dấu phẩy)">
                    <Input value={form.features} onChange={(event) => update("features", event.target.value)} placeholder="live_dj, outdoor, pool" />
                </FieldGroup>
                <div className="flex flex-wrap gap-5">
                    <label className="flex items-center gap-2 text-sm text-white">
                        <input type="checkbox" className="accent-amber" checked={form.is_vip_only} onChange={(event) => update("is_vip_only", event.target.checked)} />
                        Chỉ dành cho VIP
                    </label>
                    {mode === "edit" && (
                        <>
                            <label className="flex items-center gap-2 text-sm text-white">
                                <input type="checkbox" className="accent-amber" checked={form.is_active} onChange={(event) => update("is_active", event.target.checked)} />
                                Đang hoạt động
                            </label>
                            <label className="flex items-center gap-2 text-sm text-white">
                                <input type="checkbox" className="accent-amber" checked={form.is_verified} onChange={(event) => update("is_verified", event.target.checked)} />
                                Đã xác minh
                            </label>
                        </>
                    )}
                </div>
            </section>

            {error && <Alert>{error}</Alert>}
            {saved && <Alert tone="success">Đã lưu thay đổi.</Alert>}

            <div>
                <Button type="submit" disabled={loading}>
                    {loading ? "Đang lưu..." : mode === "create" ? "Tạo venue" : "Lưu thay đổi"}
                </Button>
            </div>
        </form>
    );
}
