import Link from "next/link";
import type { Metadata } from "next";
import { serverFetch } from "@/lib/api/server";
import { ApiError } from "@/lib/api/envelope";
import type { Event, Paginated } from "@/lib/api/types";
import { EventCard } from "@/components/events/EventCard";
import { Pagination } from "@/components/ui/Pagination";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata: Metadata = { title: "Sự kiện · Nightlife.vn" };

const EMPTY_RESULT: Paginated<Event> = { items: [], pagination: { page: 1, limit: 12, total: 0, total_pages: 0 } };

interface PageProps {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function EventsPage({ searchParams }: PageProps) {
    const params = await searchParams;
    const genre = typeof params.genre === "string" ? params.genre : undefined;
    const dateFrom = typeof params.date_from === "string" ? params.date_from : undefined;
    const page = typeof params.page === "string" ? params.page : "1";

    const query = new URLSearchParams({ page, limit: "12", is_active: "true" });

    if (genre) query.set("genre", genre);
    if (dateFrom) query.set("date_from", dateFrom);

    let result = EMPTY_RESULT;
    let loadError = false;

    try {
        result = await serverFetch<Paginated<Event>>(`/api/v1/events?${query.toString()}`);
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

        return `/events?${next.toString()}`;
    }

    return (
        <div className="mx-auto max-w-5xl px-5 py-16 sm:px-10">
            <SectionHeading
                tag="Sự kiện & Concerts"
                title={
                    <>
                        Đừng bỏ lỡ
                        <br />
                        <em className="not-italic text-amber">— events sắp diễn ra</em>
                    </>
                }
            />

            <form method="get" className="mt-6 flex flex-wrap items-center gap-2">
                <input
                    type="date"
                    name="date_from"
                    defaultValue={dateFrom}
                    className="h-9 rounded-lg border-[1.5px] border-border-strong bg-void-3 px-2.5 text-xs text-white outline-none focus:border-amber"
                />
                <input
                    type="text"
                    name="genre"
                    defaultValue={genre}
                    placeholder="Thể loại (vd: edm, jazz)"
                    className="h-9 rounded-lg border-[1.5px] border-border-strong bg-void-3 px-2.5 text-xs text-white outline-none placeholder:text-muted-2 focus:border-amber"
                />
                <button type="submit" className="h-9 rounded-lg border-[1.5px] border-border-strong px-3 text-xs font-semibold text-muted hover:border-amber-border hover:text-amber">
                    Lọc
                </button>
                {(genre || dateFrom) && (
                    <Link href="/events" className="text-xs text-muted hover:text-white">
                        Xoá bộ lọc
                    </Link>
                )}
            </form>

            {loadError ? (
                <div className="mt-10">
                    <EmptyState icon="⚠️" title="Không tải được danh sách sự kiện" description="Vui lòng thử lại sau." />
                </div>
            ) : result.items.length === 0 ? (
                <div className="mt-10">
                    <EmptyState title="Chưa có sự kiện nào" description="Quay lại sau để không bỏ lỡ events hot." />
                </div>
            ) : (
                <>
                    <div className="mt-8 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                        {result.items.map((event) => (
                            <EventCard key={event.id} event={event} />
                        ))}
                    </div>
                    <Pagination pagination={result.pagination} buildHref={buildHref} />
                </>
            )}
        </div>
    );
}
