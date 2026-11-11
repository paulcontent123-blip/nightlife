// "Near me" helpers shared by the venues page (server) and the locate button
// (client). The browser Geolocation API is free and needs no API key.

export const NEARBY_RADII = [1000, 3000, 5000, 10000] as const;
export const DEFAULT_NEARBY_RADIUS = 3000;
// Above this accuracy (metres) the position is probably IP-based (desktop on a
// wired network) and the user is warned that results may be off.
export const INACCURATE_POSITION_METERS = 2000;

// Fallback when the device position is unavailable or denied. Centres are
// approximate landmarks of popular nightlife areas.
export const NEARBY_AREAS = [
    { key: "q1", name: "Quận 1 · Nguyễn Huệ", city: "hcm", lat: 10.774, lng: 106.7038 },
    { key: "bui-vien", name: "Bùi Viện", city: "hcm", lat: 10.7672, lng: 106.6936 },
    { key: "q3", name: "Quận 3", city: "hcm", lat: 10.783, lng: 106.687 },
    { key: "thao-dien", name: "Thảo Điền", city: "hcm", lat: 10.803, lng: 106.736 },
    { key: "phu-my-hung", name: "Phú Mỹ Hưng", city: "hcm", lat: 10.729, lng: 106.719 },
    { key: "hoan-kiem", name: "Hoàn Kiếm", city: "hanoi", lat: 21.0285, lng: 105.8522 },
    { key: "tay-ho", name: "Tây Hồ", city: "hanoi", lat: 21.068, lng: 105.824 },
    { key: "my-khe", name: "Mỹ Khê", city: "danang", lat: 16.059, lng: 108.247 },
    { key: "hai-chau", name: "Hải Châu", city: "danang", lat: 16.067, lng: 108.221 },
] as const;

export type NearbyArea = (typeof NEARBY_AREAS)[number];

export function findNearbyArea(key: string | null | undefined) {
    return NEARBY_AREAS.find((area) => area.key === key) ?? null;
}

// ~110 m precision: enough to rank venues, and the exact position never ends
// up in URLs, history or server logs.
export function roundCoordinate(value: number) {
    return Math.round(value * 1000) / 1000;
}

export function normalizeRadius(value: string | number | null | undefined) {
    const radius = Number(value);

    return (NEARBY_RADII as readonly number[]).includes(radius) ? radius : DEFAULT_NEARBY_RADIUS;
}

export function createNearbyHref(input: {
    lat: number;
    lng: number;
    radius?: number;
    accuracy?: number | null;
    area?: string | null;
}) {
    const params = new URLSearchParams({
        lat: String(roundCoordinate(input.lat)),
        lng: String(roundCoordinate(input.lng)),
        radius: String(input.radius ?? DEFAULT_NEARBY_RADIUS),
    });

    if (input.accuracy != null && Number.isFinite(input.accuracy)) {
        params.set("acc", String(Math.round(input.accuracy)));
    }

    if (input.area) {
        params.set("area", input.area);
    }

    return `/venues?${params.toString()}`;
}

// Reads lat/lng/radius from the venues page search params; null when the page
// is not in "near me" mode or the values are invalid.
export function readNearbyParams(params: Record<string, string | string[] | undefined>) {
    const lat = Number(typeof params.lat === "string" ? params.lat : NaN);
    const lng = Number(typeof params.lng === "string" ? params.lng : NaN);

    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
        return null;
    }

    const accuracy = Number(typeof params.acc === "string" ? params.acc : NaN);

    return {
        lat: roundCoordinate(lat),
        lng: roundCoordinate(lng),
        radius: normalizeRadius(typeof params.radius === "string" ? params.radius : null),
        accuracy: Number.isFinite(accuracy) ? accuracy : null,
        area: findNearbyArea(typeof params.area === "string" ? params.area : null),
    };
}

export function formatDistance(meters: number, locale: string) {
    if (meters < 1000) {
        return `${Math.max(10, Math.round(meters / 10) * 10)} m`;
    }

    return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(meters / 1000)} km`;
}
