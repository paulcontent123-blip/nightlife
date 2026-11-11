"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Spinner } from "@/components/ui/Spinner";
import { createNearbyHref, NEARBY_AREAS } from "@/lib/geo/nearby";
import { CITY_LABEL } from "@/lib/format";

type LocateError = "denied" | "unavailable" | "timeout" | "unsupported";

const LOCATE_TIMEOUT_MS = 10_000;
// Reuse a position up to 5 minutes old so repeated clicks are instant.
const LOCATE_MAX_AGE_MS = 5 * 60 * 1000;
const IN_APP_BROWSER = /(FBAN|FBAV|FB_IAB|Instagram|Zalo|Line\/|Messenger)/i;

// "Near me": asks for the browser position only when the user clicks
// (never on page load), then opens the venues page in nearby mode. Falls back
// to a list of popular areas when the position is denied or unavailable.
export function NearMeButton({ radius, label }: { radius?: number; label?: string }) {
    const t = useTranslations("Nearby");
    const router = useRouter();
    const [locating, setLocating] = useState(false);
    const [error, setError] = useState<LocateError | null>(null);
    const [showAreas, setShowAreas] = useState(false);

    function locate() {
        setError(null);

        if (typeof navigator === "undefined" || !("geolocation" in navigator) || !window.isSecureContext) {
            setError("unsupported");
            setShowAreas(true);
            return;
        }

        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLocating(false);
                setShowAreas(false);
                router.push(createNearbyHref({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    radius,
                    accuracy: position.coords.accuracy,
                }));
            },
            (positionError) => {
                setLocating(false);
                setShowAreas(true);
                setError(
                    positionError.code === positionError.PERMISSION_DENIED
                        ? "denied"
                        : positionError.code === positionError.TIMEOUT
                            ? "timeout"
                            : "unavailable"
                );
            },
            { enableHighAccuracy: true, timeout: LOCATE_TIMEOUT_MS, maximumAge: LOCATE_MAX_AGE_MS }
        );
    }

    const inAppBrowser = typeof navigator !== "undefined" && IN_APP_BROWSER.test(navigator.userAgent);

    return (
        <div className="flex min-w-0 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
                <button
                    type="button"
                    onClick={locate}
                    disabled={locating}
                    className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-lg border-[1.5px] border-amber-border bg-amber-wash px-3.5 text-[13px] font-semibold text-amber transition-colors hover:bg-amber hover:text-void disabled:opacity-60"
                >
                    {locating ? <Spinner /> : "📍"} {locating ? t("locating") : label ?? t("nearMe")}
                </button>
                <button
                    type="button"
                    onClick={() => setShowAreas((open) => !open)}
                    className="h-9 whitespace-nowrap rounded-lg px-2 text-[13px] font-semibold text-muted underline-offset-4 hover:text-amber hover:underline"
                >
                    {t("chooseArea")}
                </button>
            </div>

            {error && (
                <div className="rounded-lg border border-pink/40 bg-pink/10 px-3.5 py-2.5 text-[13px] text-white">
                    {t(error)}
                    {inAppBrowser && <p className="mt-1 text-muted">{t("inApp")}</p>}
                    {error !== "denied" && error !== "unsupported" && (
                        <button type="button" onClick={locate} className="ml-2 font-semibold text-amber hover:underline">
                            {t("retry")}
                        </button>
                    )}
                </div>
            )}

            {showAreas && (
                <div className="rounded-xl border border-border bg-void-2 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="text-xs font-bold uppercase tracking-wide text-muted">{t("areasTitle")}</p>
                        <button type="button" onClick={() => setShowAreas(false)} className="text-xs text-muted hover:text-white">
                            {t("close")}
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {NEARBY_AREAS.map((area) => (
                            <button
                                key={area.key}
                                type="button"
                                onClick={() => {
                                    setShowAreas(false);
                                    router.push(createNearbyHref({ lat: area.lat, lng: area.lng, radius, area: area.key }));
                                }}
                                className="whitespace-nowrap rounded-lg border-[1.5px] border-border-strong px-3 py-1.5 text-[13px] font-semibold text-muted transition-colors hover:border-amber-border hover:text-amber"
                            >
                                {area.name}
                                <span className="ml-1 text-[11px] font-normal opacity-70">{CITY_LABEL[area.city]}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <p className="text-[11px] text-muted">{t("privacy")}</p>
        </div>
    );
}
