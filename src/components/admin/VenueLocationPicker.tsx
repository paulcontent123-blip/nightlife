"use client";

import { useEffect, useState, type ClipboardEvent } from "react";
import { createGoogleMapsEmbedUrl, createGoogleMapsSearchUrl } from "@/lib/google-maps/links";
import { isInVietnam, parseMapLocation, type ParseLocationResult } from "@/lib/google-maps/parse-location";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FieldGroup, Input } from "@/components/ui/Field";

const PREVIEW_DELAY_MS = 600;

const PARSE_ERROR: Record<Exclude<ParseLocationResult, { ok: true }>["reason"], string> = {
    empty: "Hãy dán tọa độ hoặc link Google Maps.",
    short_link:
        "Link rút gọn (maps.app.goo.gl) không chứa tọa độ. Hãy mở link đó, rồi nhấn giữ (điện thoại) hoặc chuột phải (máy tính) vào vị trí quán để copy tọa độ.",
    not_found: "Không tìm thấy tọa độ. Hãy dán dạng “10.7769, 106.7009” hoặc link Google Maps đầy đủ.",
    out_of_range: "Tọa độ không hợp lệ (vĩ độ trong khoảng ±90, kinh độ trong khoảng ±180).",
};

// Admin pins a venue by pasting coordinates or a Google Maps link, then checks
// the pin on a live preview map before saving.
export function VenueLocationPicker({
    lat,
    lng,
    address,
    onChange,
}: {
    lat: string;
    lng: string;
    address: string;
    onChange: (lat: string, lng: string) => void;
}) {
    const [pasteValue, setPasteValue] = useState("");
    const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);
    const preview = useDebouncedValue({ lat, lng }, PREVIEW_DELAY_MS);

    const previewLocation = toLocation(preview.lat, preview.lng);
    const embedUrl = previewLocation ? createGoogleMapsEmbedUrl(previewLocation, 17) : null;
    const searchUrl = previewLocation ? createGoogleMapsSearchUrl(previewLocation) : null;
    const outsideVietnam = previewLocation ? !isInVietnam(previewLocation) : false;
    const findOnMapsUrl = address.trim()
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address.trim())}`
        : "https://www.google.com/maps";

    function apply(value: string) {
        const result = parseMapLocation(value);

        if (!result.ok) {
            setMessage({ tone: "error", text: PARSE_ERROR[result.reason] });
            return;
        }

        onChange(String(result.location.lat), String(result.location.lng));
        setPasteValue("");
        setMessage({ tone: "success", text: `Đã ghim tại ${result.location.lat}, ${result.location.lng}. Kiểm tra bản đồ bên dưới.` });
    }

    function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
        const pasted = event.clipboardData.getData("text");

        if (parseMapLocation(pasted).ok) {
            event.preventDefault();
            apply(pasted);
        }
    }

    return (
        <div className="flex flex-col gap-3 rounded-xl border border-border-strong bg-void-3 p-4">
            <div>
                <p className="text-sm font-semibold text-white">📍 Ghim vị trí</p>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                    Mở{" "}
                    <a href={findOnMapsUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-amber hover:underline">
                        Google Maps
                    </a>
                    , nhấn giữ (điện thoại) hoặc chuột phải (máy tính) vào đúng cửa quán, copy tọa độ hoặc link rồi dán vào ô
                    dưới đây.
                </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                    value={pasteValue}
                    onChange={(event) => setPasteValue(event.target.value)}
                    onPaste={handlePaste}
                    onKeyDown={(event) => {
                        // Enter applies the pasted value instead of submitting the whole venue form.
                        if (event.key === "Enter") {
                            event.preventDefault();
                            apply(pasteValue);
                        }
                    }}
                    placeholder="10.7769, 106.7009 hoặc https://www.google.com/maps/…"
                    aria-label="Dán tọa độ hoặc link Google Maps"
                    className="sm:flex-1"
                />
                <Button type="button" variant="ghost" onClick={() => apply(pasteValue)}>
                    Lấy tọa độ
                </Button>
            </div>

            {message && <Alert tone={message.tone}>{message.text}</Alert>}

            <div className="grid grid-cols-2 gap-3">
                <FieldGroup label="Lat (vĩ độ)">
                    <Input
                        type="number"
                        step="any"
                        min={-90}
                        max={90}
                        required
                        value={lat}
                        onChange={(event) => onChange(event.target.value, lng)}
                        placeholder="10.7769"
                    />
                </FieldGroup>
                <FieldGroup label="Lng (kinh độ)">
                    <Input
                        type="number"
                        step="any"
                        min={-180}
                        max={180}
                        required
                        value={lng}
                        onChange={(event) => onChange(lat, event.target.value)}
                        placeholder="106.7009"
                    />
                </FieldGroup>
            </div>

            {outsideVietnam && (
                <Alert>Tọa độ này nằm ngoài Việt Nam. Bạn có nhập ngược vĩ độ và kinh độ không?</Alert>
            )}

            {embedUrl ? (
                <div className="overflow-hidden rounded-lg border border-border">
                    <iframe
                        key={embedUrl}
                        src={embedUrl}
                        title="Xem trước vị trí venue"
                        className="block h-64 w-full border-0"
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                    />
                    {searchUrl && (
                        <a
                            href={searchUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block border-t border-border px-3 py-2 text-xs font-semibold text-amber hover:underline"
                        >
                            Mở vị trí này trên Google Maps để kiểm tra →
                        </a>
                    )}
                </div>
            ) : (
                <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-border-strong text-xs text-muted">
                    Bản đồ xem trước sẽ hiện khi có tọa độ hợp lệ.
                </div>
            )}
        </div>
    );
}

function toLocation(lat: string, lng: string) {
    if (lat.trim() === "" || lng.trim() === "") {
        return null;
    }

    const location = { lat: Number(lat), lng: Number(lng) };

    if (
        !Number.isFinite(location.lat)
        || !Number.isFinite(location.lng)
        || Math.abs(location.lat) > 90
        || Math.abs(location.lng) > 180
    ) {
        return null;
    }

    return location;
}

function useDebouncedValue<T>(value: T, delayMs: number) {
    const [debounced, setDebounced] = useState(value);
    const serialized = JSON.stringify(value);

    useEffect(() => {
        const timer = setTimeout(() => setDebounced(JSON.parse(serialized) as T), delayMs);

        return () => clearTimeout(timer);
    }, [serialized, delayMs]);

    return debounced;
}
