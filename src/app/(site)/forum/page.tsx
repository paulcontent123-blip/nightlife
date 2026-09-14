import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ForumListService } from "@/modules/forums/forum-list.service";
import { ForumPostCard } from "@/components/forum/ForumPostCard";
import { CreatePostForm } from "@/components/forum/CreatePostForm";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { CITY_LABEL } from "@/lib/format";

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("Forum");
    return { title: t("metaTitle") };
}

interface PageProps {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const forumListService = new ForumListService();

export default async function ForumPage({ searchParams }: PageProps) {
    const [forumT, commonT] = await Promise.all([
        getTranslations("Forum"),
        getTranslations("Common"),
    ]);
    const params = await searchParams;
    const city = typeof params.city === "string" ? params.city : undefined;
    const tag = typeof params.tag === "string" ? params.tag : undefined;
    const venueId = typeof params.venue_id === "string" ? params.venue_id : undefined;
    const venueName = typeof params.venue_name === "string" ? params.venue_name : undefined;
    const sort = params.sort === "new" ? "new" : "hot";
    const page = typeof params.page === "string" ? params.page : "1";

    const query = new URLSearchParams({ page, limit: "10", sort });

    if (city) query.set("city", city);
    if (tag) query.set("tag", tag);
    if (venueId) query.set("venue_id", venueId);

    const result = await forumListService.listPublicPosts(query);

    if (result.pagination.total_pages > 0 && result.pagination.page > result.pagination.total_pages) {
        query.set("page", String(result.pagination.total_pages));
        redirect(`/forum?${query.toString()}`);
    }

    const persistedParams = { ...(city ? { city } : {}), ...(tag ? { tag } : {}), ...(venueId ? { venue_id: venueId } : {}) };

    function buildHref(nextPage: number) {
        const next = new URLSearchParams(query);
        next.set("page", String(nextPage));

        return `/forum?${next.toString()}`;
    }

    return (
        <div className="mx-auto min-w-0 max-w-3xl px-5 py-12 sm:px-10 sm:py-16">
            <SectionHeading
                tag={forumT("eyebrow")}
                title={
                    <>
                        {forumT("title")}
                        <br />
                        <em className="not-italic text-amber">{forumT("subtitle")}</em>
                    </>
                }
            />

            <div className="mt-6">
                <Suspense fallback={null}>
                    <CreatePostForm />
                </Suspense>
            </div>

            {venueId && (
                <div className="mt-4 flex items-center gap-2 text-xs">
                    <span className="min-w-0 break-words text-muted">{forumT("filteringVenue")}{venueName ? `: ${venueName}` : ""}</span>
                    <Link href="/forum" className="font-semibold text-amber hover:underline">
                        ✕ {forumT("removeFilter")}
                    </Link>
                </div>
            )}

            <form method="get" className="mt-6 flex min-w-0 flex-wrap items-center gap-2">
                <input type="hidden" name="sort" value={sort} />
                {venueId && <input type="hidden" name="venue_id" value={venueId} />}
                {venueName && <input type="hidden" name="venue_name" value={venueName} />}
                <select
                    name="city"
                    defaultValue={city ?? ""}
                    className="h-9 w-full min-w-0 rounded-lg border-[1.5px] border-border-strong bg-void-3 px-2.5 text-xs text-white outline-none focus:border-amber sm:w-auto"
                >
                    <option value="">{forumT("allCities")}</option>
                    {Object.entries(CITY_LABEL).map(([value, label]) => (
                        <option key={value} value={value}>
                            {label}
                        </option>
                    ))}
                </select>
                <input
                    type="text"
                    name="tag"
                    defaultValue={tag}
                    placeholder={forumT("tagPlaceholder")}
                    className="h-9 w-full min-w-0 rounded-lg border-[1.5px] border-border-strong bg-void-3 px-2.5 text-xs text-white outline-none placeholder:text-muted-2 focus:border-amber sm:w-auto sm:flex-1"
                />
                <button type="submit" className="h-9 rounded-lg border-[1.5px] border-border-strong px-3 text-xs font-semibold text-muted hover:border-amber-border hover:text-amber">
                    {commonT("filter")}
                </button>
                <div className="flex w-full gap-1.5 sm:ml-auto sm:w-auto">
                    <Link
                        href={`/forum?${new URLSearchParams({ ...persistedParams, sort: "hot" }).toString()}`}
                        className={["rounded-lg border-[1.5px] px-3 py-1.5 text-xs font-semibold", sort === "hot" ? "border-amber-border bg-amber-wash text-amber" : "border-border-strong text-muted"].join(" ")}
                    >
                        {forumT("featured")}
                    </Link>
                    <Link
                        href={`/forum?${new URLSearchParams({ ...persistedParams, sort: "new" }).toString()}`}
                        className={["rounded-lg border-[1.5px] px-3 py-1.5 text-xs font-semibold", sort === "new" ? "border-amber-border bg-amber-wash text-amber" : "border-border-strong text-muted"].join(" ")}
                    >
                        {forumT("latest")}
                    </Link>
                </div>
            </form>

            {result.items.length === 0 ? (
                <div className="mt-10">
                    <EmptyState title={forumT("empty")} description={forumT("emptyDescription")} />
                </div>
            ) : (
                <>
                    <div className="mt-6 flex flex-col gap-3">
                        {result.items.map((post) => (
                            <ForumPostCard key={post.id} post={post} />
                        ))}
                    </div>
                    <Pagination pagination={result.pagination} buildHref={buildHref} />
                </>
            )}
        </div>
    );
}
