import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { AuthException } from "@/modules/auth/auth.errors";
import { VenueService } from "@/modules/venues/venue.service";
import { VenueCard } from "@/components/venues/VenueCard";
import { NearMeButton } from "@/components/venues/NearMeButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { createGoogleMapsDirectionsUrl } from "@/lib/google-maps/links";
import {
    createNearbyHref,
    formatDistance,
    INACCURATE_POSITION_METERS,
    NEARBY_RADII,
    type readNearbyParams,
} from "@/lib/geo/nearby";

const venueService = new VenueService();
const PAGE_SIZE = 12;

type NearbyParams = NonNullable<ReturnType<typeof readNearbyParams>>;

export async function NearbyVenueResults({ nearby, page }: { nearby: NearbyParams; page: number }) {
    const [t, venuesT, commonT, locale] = await Promise.all([
        getTranslations("Nearby"),
        getTranslations("Venues"),
        getTranslations("Common"),
        getLocale(),
    ]);
    const radiusLabel = formatDistance(nearby.radius, locale);
    const query = new URLSearchParams({
        lat: String(nearby.lat),
        lng: String(nearby.lng),
        radius: String(nearby.radius),
        page: String(page),
        limit: String(PAGE_SIZE),
    });

    let result: Awaited<ReturnType<VenueService["listNearbyVenues"]>>;

    try {
        result = await venueService.listNearbyVenues(query);
    } catch (error) {
        if (error instanceof AuthException) {
            return (
                <div className="mt-10">
                    <EmptyState icon="⚠️" title={venuesT("loadError")} description={commonT("tryAgain")} />
                </div>
            );
        }

        throw error;
    }

    const hrefFor = (radius: number, nextPage?: number) => {
        const href = createNearbyHref({
            lat: nearby.lat,
            lng: nearby.lng,
            radius,
            accuracy: nearby.accuracy,
            area: nearby.area?.key,
        });

        return nextPage && nextPage > 1 ? `${href}&page=${nextPage}` : href;
    };

    return (
        <div className="mt-6 flex flex-col gap-4">
            <div className="flex flex-col gap-3 rounded-xl border border-border bg-void-2 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-display text-lg font-extrabold">
                        {nearby.area ? t("nearArea", { area: nearby.area.name }) : t("nearYou")}
                    </p>
                    <Link href="/venues" prefetch={false} className="text-[13px] font-semibold text-muted hover:text-amber">
                        ← {t("showAll")}
                    </Link>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wide text-muted">{t("radius")}</span>
                    {NEARBY_RADII.map((radius) => (
                        <Link
                            key={radius}
                            href={hrefFor(radius)}
                            prefetch={false}
                            className={[
                                "rounded-lg border-[1.5px] px-3 py-1 text-[13px] font-semibold transition-colors",
                                radius === nearby.radius
                                    ? "border-amber-border bg-amber-wash text-amber"
                                    : "border-border-strong text-muted hover:border-amber-border hover:text-amber",
                            ].join(" ")}
                        >
                            {formatDistance(radius, locale)}
                        </Link>
                    ))}
                </div>

                {!nearby.area && nearby.accuracy != null && nearby.accuracy > INACCURATE_POSITION_METERS && (
                    <p className="rounded-lg border border-amber-border bg-amber-wash px-3.5 py-2 text-[13px] text-white">
                        {t("inaccurate", { distance: formatDistance(nearby.accuracy, locale) })}
                    </p>
                )}

                <NearMeButton radius={nearby.radius} />
            </div>

            {result.items.length === 0 ? (
                <EmptyState title={t("empty", { radius: radiusLabel })} description={t("emptyHint")} />
            ) : (
                <>
                    <p className="text-sm text-muted">{t("found", { count: result.pagination.total, radius: radiusLabel })}</p>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {result.items.map((venue, index) => {
                            const distance = formatDistance(venue.distance.meters, locale);
                            const directionsUrl = createGoogleMapsDirectionsUrl({
                                lat: venue.location.lat,
                                lng: venue.location.lng,
                                address: venue.address,
                            });

                            return (
                                <div key={venue.id} className="flex min-w-0 flex-col gap-1.5">
                                    <VenueCard
                                        venue={venue}
                                        priority={index < 3}
                                        distanceLabel={t("away", { distance })}
                                    />
                                    {directionsUrl && (
                                        <a
                                            href={directionsUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="self-end px-1 text-[13px] font-semibold text-amber hover:underline"
                                        >
                                            {t("directions")} ↗
                                        </a>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    <Pagination pagination={result.pagination} buildHref={(nextPage) => hrefFor(nearby.radius, nextPage)} />
                </>
            )}
        </div>
    );
}
