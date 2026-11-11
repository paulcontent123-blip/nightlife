import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { VenueFilterBar } from "@/components/venues/VenueFilterBar";
import { VenueResults } from "@/components/venues/VenueResults";
import { VenueResultsSkeleton } from "@/components/venues/VenueResultsSkeleton";
import { NearMeButton } from "@/components/venues/NearMeButton";
import { NearbyVenueResults } from "@/components/venues/NearbyVenueResults";
import { readNearbyParams } from "@/lib/geo/nearby";
import { SectionHeading } from "@/components/ui/SectionHeading";

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("Venues");
    return { title: t("metaTitle") };
}

const FILTER_KEYS = ["city", "type", "district", "price_range", "sort"] as const;
interface VenuesPageProps {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function VenuesPage({ searchParams }: VenuesPageProps) {
    const t = await getTranslations("Venues");
    const params = await searchParams;
    const query = new URLSearchParams();

    for (const key of FILTER_KEYS) {
        const value = params[key];

        if (typeof value === "string" && value) {
            query.set(key, value);
        }
    }

    const page = typeof params.page === "string" ? params.page : "1";
    query.set("page", page);
    query.set("limit", "12");

    // "Near me" mode: ?lat=&lng=&radius= (set by NearMeButton or an area chip).
    const nearby = readNearbyParams(params);
    const pageNumber = Math.max(1, Number.parseInt(page, 10) || 1);

    return (
        <div className="mx-auto min-w-0 max-w-6xl px-5 py-12 sm:px-10 sm:py-16">
            <SectionHeading
                tag={t("eyebrow")}
                title={
                    <>
                        {t("title")}
                        <br />
                        <em className="not-italic text-amber">{t("subtitle")}</em>
                    </>
                }
            />

            {nearby ? (
                <Suspense key={`${nearby.lat},${nearby.lng},${nearby.radius},${pageNumber}`} fallback={<VenueResultsSkeleton />}>
                    <NearbyVenueResults nearby={nearby} page={pageNumber} />
                </Suspense>
            ) : (
                <>
                    <div className="mt-6 flex flex-col gap-3">
                        <NearMeButton />
                        <Suspense fallback={null}>
                            <VenueFilterBar />
                        </Suspense>
                    </div>

                    <Suspense fallback={<VenueResultsSkeleton />}>
                        <VenueResults queryString={query.toString()} />
                    </Suspense>
                </>
            )}
        </div>
    );
}
