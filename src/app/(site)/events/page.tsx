import Link from "next/link";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthException } from "@/modules/auth/auth.errors";
import { EventListService } from "@/modules/events/event-list.service";
import type { Event, Paginated } from "@/lib/api/types";
import { EventCard } from "@/components/events/EventCard";
import { Pagination } from "@/components/ui/Pagination";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { EmptyState } from "@/components/ui/EmptyState";

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("Events");
    return { title: t("metaTitle") };
}

const EMPTY_RESULT: Paginated<Event> = { items: [], pagination: { page: 1, limit: 12, total: 0, total_pages: 0 } };
const eventListService = new EventListService();

interface PageProps {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function EventsPage({ searchParams }: PageProps) {
    const [eventsT, commonT] = await Promise.all([
        getTranslations("Events"),
        getTranslations("Common"),
    ]);
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
        result = await eventListService.listPublicEvents(query);
    } catch (error) {
        if (error instanceof AuthException) {
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
        <div className="mx-auto min-w-0 max-w-5xl px-5 py-12 sm:px-10 sm:py-16">
            <SectionHeading
                tag={eventsT("eyebrow")}
                title={
                    <>
                        {eventsT("title")}
                        <br />
                        <em className="not-italic text-amber">{eventsT("subtitle")}</em>
                    </>
                }
            />

            <form method="get" className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-[auto_minmax(180px,1fr)_auto_auto] sm:items-center">
                <input
                    type="date"
                    name="date_from"
                    defaultValue={dateFrom}
                    aria-label={commonT("filter")}
                    className="h-9 w-full min-w-0 rounded-lg border-[1.5px] border-border-strong bg-void-3 px-2.5 text-xs text-white outline-none focus:border-amber"
                />
                <input
                    type="text"
                    name="genre"
                    defaultValue={genre}
                    placeholder={eventsT("genrePlaceholder")}
                    className="h-9 w-full min-w-0 rounded-lg border-[1.5px] border-border-strong bg-void-3 px-2.5 text-xs text-white outline-none placeholder:text-muted-2 focus:border-amber"
                />
                <button type="submit" className="h-9 rounded-lg border-[1.5px] border-border-strong px-3 text-xs font-semibold text-muted hover:border-amber-border hover:text-amber">
                    {commonT("filter")}
                </button>
                {(genre || dateFrom) && (
                    <Link href="/events" className="text-xs text-muted hover:text-white">
                        {commonT("clearFilters")}
                    </Link>
                )}
            </form>

            {loadError ? (
                <div className="mt-10">
                    <EmptyState icon="⚠️" title={eventsT("loadError")} description={commonT("tryAgain")} />
                </div>
            ) : result.items.length === 0 ? (
                <div className="mt-10">
                    <EmptyState title={eventsT("empty")} description={eventsT("emptyDescription")} />
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
