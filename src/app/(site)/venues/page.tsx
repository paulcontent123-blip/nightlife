import { Suspense } from "react";
import type { Metadata } from "next";
import { VenueFilterBar } from "@/components/venues/VenueFilterBar";
import { VenueResults } from "@/components/venues/VenueResults";
import { VenueResultsSkeleton } from "@/components/venues/VenueResultsSkeleton";
import { SectionHeading } from "@/components/ui/SectionHeading";

export const metadata: Metadata = { title: "Địa điểm · Nightlife.vn" };

const FILTER_KEYS = ["city", "type", "district", "price_range", "sort"] as const;
interface VenuesPageProps {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function VenuesPage({ searchParams }: VenuesPageProps) {
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
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-10">
            <SectionHeading
                tag="Khám phá địa điểm"
                title={
                    <>
                        Venues đã xác minh
                        <br />
                        <em className="not-italic text-amber">— tìm đúng nơi, đúng mood</em>
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
