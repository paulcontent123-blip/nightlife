// Reads coordinates from whatever an admin copies out of Google Maps:
// - plain coordinates:   "10.7769, 106.7009" (long-press / right-click a spot)
// - degrees-minutes-sec: 10°46'36.8"N 106°42'03.2"E
// - full Google Maps links (place, search, directions or map-view URLs)
// Short links (maps.app.goo.gl) only redirect to the real URL, so they carry
// no coordinates and are reported separately.

export interface ParsedLocation {
    lat: number;
    lng: number;
}

export type ParseLocationResult =
    | { ok: true; location: ParsedLocation }
    | { ok: false; reason: "empty" | "short_link" | "not_found" | "out_of_range" };

const NUMBER = "(-?\\d{1,3}(?:\\.\\d+)?)";

// Ordered by precision: a place URL's !3d!4d is the pin itself, query
// parameters are explicit points, and "@lat,lng" is only the map centre.
const URL_PATTERNS = [
    new RegExp(`!3d${NUMBER}!4d${NUMBER}`),
    new RegExp(`[?&](?:q|query|ll|destination|daddr|center)=${NUMBER},\\s*${NUMBER}`),
    new RegExp(`@${NUMBER},${NUMBER}`),
];

const PLAIN_PATTERN = new RegExp(`^\\(?\\s*${NUMBER}\\s*[,;\\s]\\s*${NUMBER}\\s*\\)?$`);

const DMS_PART = "(\\d{1,3})\\s*°\\s*(\\d{1,2})\\s*['′]\\s*(\\d{1,2}(?:\\.\\d+)?)\\s*(?:\"|″|'')?\\s*";
const DMS_PATTERN = new RegExp(`${DMS_PART}([NS])[\\s,]+${DMS_PART}([EW])`, "i");

export function parseMapLocation(input: string): ParseLocationResult {
    const raw = input.trim();

    if (!raw) {
        return { ok: false, reason: "empty" };
    }

    if (/(?:maps\.app\.goo\.gl|goo\.gl\/maps)/i.test(raw)) {
        return { ok: false, reason: "short_link" };
    }

    const text = safeDecode(raw);

    for (const pattern of URL_PATTERNS) {
        const match = text.match(pattern);

        if (match) {
            return toResult(Number(match[1]), Number(match[2]));
        }
    }

    const dms = text.match(DMS_PATTERN);

    if (dms) {
        const lat = fromDms(dms[1], dms[2], dms[3], dms[4]);
        const lng = fromDms(dms[5], dms[6], dms[7], dms[8]);

        return toResult(lat, lng);
    }

    const plain = text.match(PLAIN_PATTERN);

    if (plain) {
        return toResult(Number(plain[1]), Number(plain[2]));
    }

    return { ok: false, reason: "not_found" };
}

// Rough bounding box of Vietnam, used to warn about swapped or mistyped values.
export function isInVietnam(location: ParsedLocation) {
    return location.lat >= 8 && location.lat <= 23.5 && location.lng >= 102 && location.lng <= 110;
}

function toResult(lat: number, lng: number): ParseLocationResult {
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
        return { ok: false, reason: "out_of_range" };
    }

    // venues.lat / venues.lng are DECIMAL(10, 7).
    return { ok: true, location: { lat: round7(lat), lng: round7(lng) } };
}

function fromDms(degrees: string, minutes: string, seconds: string, hemisphere: string) {
    const value = Number(degrees) + Number(minutes) / 60 + Number(seconds) / 3600;

    return /[SW]/i.test(hemisphere) ? -value : value;
}

function round7(value: number) {
    return Math.round(value * 1e7) / 1e7;
}

function safeDecode(value: string) {
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
}
