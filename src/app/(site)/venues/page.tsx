import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { VenueFilterBar } from "@/components/venues/VenueFilterBar";
import { VenueResults } from "@/components/venues/VenueResults";
import { VenueResultsSkeleton } from "@/components/venues/VenueResultsSkeleton";
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

            <div className="mt-6">
                <Suspense fallback={null}>
                    <VenueFilterBar />
                </Suspense>
            </div>

            <Suspense fallback={<VenueResultsSkeleton />}>
                <VenueResults queryString={query.toString()} />
            </Suspense>
        </div>
    );
}
