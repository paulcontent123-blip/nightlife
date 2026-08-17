import { Suspense } from "react";
import type { Metadata } from "next";
import { serverFetch } from "@/lib/api/server";
import { ApiError } from "@/lib/api/envelope";
import type { Paginated, Venue } from "@/lib/api/types";
import { VenueCard } from "@/components/venues/VenueCard";
import { VenueFilterBar } from "@/components/venues/VenueFilterBar";
import { Pagination } from "@/components/ui/Pagination";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata: Metadata = { title: "Địa điểm · Nightlife.vn" };

const FILTER_KEYS = ["city", "type", "district", "price_range", "sort"] as const;
const EMPTY_RESULT: Paginated<Venue> = { items: [], pagination: { page: 1, limit: 12, total: 0, total_pages: 0 } };

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

    let result = EMPTY_RESULT;
    let loadError = false;

    try {
        result = await serverFetch<Paginated<Venue>>(`/api/v1/venues?${query.toString()}`);
    } catch (error) {
        if (error instanceof ApiError) {
            loadError = true;
        } else {
            throw error;
        }
    }

    function buildHref(nextPage: number) {
        const next = new URLSearchParams(query);
        next.set("page", String(nextPage));

        return `/venues?${next.toString()}`;
    }

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

            {loadError ? (
                <div className="mt-10">
                    <EmptyState icon="⚠️" title="Không tải được danh sách venue" description="Vui lòng thử lại sau." />
                </div>
            ) : result.items.length === 0 ? (
                <div className="mt-10">
                    <EmptyState title="Không tìm thấy venue phù hợp" description="Thử điều chỉnh bộ lọc để xem thêm lựa chọn." />
                </div>
            ) : (
                <>
                    <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {result.items.map((venue) => (
                            <VenueCard key={venue.id} venue={venue} />
                        ))}
                    </div>
                    <Pagination pagination={result.pagination} buildHref={buildHref} />
                </>
            )}
        </div>
    );
}
