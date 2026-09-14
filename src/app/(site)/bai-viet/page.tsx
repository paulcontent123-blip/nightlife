import Link from "next/link";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthException } from "@/modules/auth/auth.errors";
import { ArticleListService } from "@/modules/articles/article-list.service";
import type { ArticleListItem, Paginated } from "@/lib/api/types";
import { ArticleCard } from "@/components/articles/ArticleCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ARTICLE_CATEGORY_LABEL } from "@/lib/format";

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("Articles");
    return { title: t("metaTitle"), description: t("metaDescription") };
}

const EMPTY_RESULT: Paginated<ArticleListItem> = {
    items: [],
    pagination: { page: 1, limit: 12, total: 0, total_pages: 0 },
};
const articleListService = new ArticleListService();

interface PageProps {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ArticlesPage({ searchParams }: PageProps) {
    const [articlesT, commonT] = await Promise.all([
        getTranslations("Articles"),
        getTranslations("Common"),
    ]);
    const params = await searchParams;
    const page = typeof params.page === "string" ? params.page : "1";
    const q = typeof params.q === "string" ? params.q : undefined;
    const city = typeof params.city === "string" ? params.city : undefined;
    const category = typeof params.category === "string" ? params.category : undefined;
    const tag = typeof params.tag === "string" ? params.tag : undefined;

    const query = new URLSearchParams({ page, limit: "12" });

    if (q) query.set("q", q);
    if (city) query.set("city", city);
    if (category) query.set("category", category);
    if (tag) query.set("tag", tag);

    let result = EMPTY_RESULT;
    let loadError = false;

    try {
        result = await articleListService.listPublicArticles(query);
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

        return `/bai-viet?${next.toString()}`;
    }

    const hasActiveFilters = Boolean(q || city || category || tag);

    return (
        <div className="mx-auto min-w-0 max-w-6xl px-5 py-12 sm:px-10 sm:py-16">
            <SectionHeading
                tag={articlesT("eyebrow")}
                title={
                    <>
                        {articlesT("title")}
                        <br />
                        <em className="not-italic text-amber">{articlesT("subtitle")}</em>
                    </>
                }
                description={articlesT("description")}
            />

            <form method="get" className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_140px_160px_140px_auto]">
                <input
                    type="search"
                    name="q"
                    defaultValue={q}
                    placeholder={articlesT("searchPlaceholder")}
                    className="h-10 rounded-lg border-[1.5px] border-border-strong bg-void-3 px-3 text-sm text-white outline-none placeholder:text-muted-2 focus:border-amber"
                />
                <input
                    type="text"
                    name="city"
                    defaultValue={city}
                    placeholder={commonT("city")}
                    className="h-10 rounded-lg border-[1.5px] border-border-strong bg-void-3 px-3 text-sm text-white outline-none placeholder:text-muted-2 focus:border-amber"
                />
                <select
                    name="category"
                    defaultValue={category ?? ""}
                    className="h-10 rounded-lg border-[1.5px] border-border-strong bg-void-3 px-3 text-sm text-white outline-none focus:border-amber"
                >
                    <option value="">{articlesT("allCategories")}</option>
                    {Object.entries(ARTICLE_CATEGORY_LABEL).map(([value, label]) => (
                        <option key={value} value={value}>
                            {label}
                        </option>
                    ))}
                </select>
                <input
                    type="text"
                    name="tag"
                    defaultValue={tag}
                    placeholder={articlesT("tagPlaceholder")}
                    className="h-10 rounded-lg border-[1.5px] border-border-strong bg-void-3 px-3 text-sm text-white outline-none placeholder:text-muted-2 focus:border-amber"
                />
                <button type="submit" className="h-10 rounded-lg border-[1.5px] border-border-strong px-4 text-sm font-semibold text-muted hover:border-amber-border hover:text-amber">
                    {commonT("filter")}
                </button>
            </form>

            {hasActiveFilters && (
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-muted">{articlesT("filteringBy")}</span>
                    {q && <span className="rounded-md bg-white/5 px-2 py-1 font-semibold text-muted">“{q}”</span>}
                    {city && <span className="rounded-md bg-white/5 px-2 py-1 font-semibold text-muted">{city}</span>}
                    {category && (
                        <span className="rounded-md bg-white/5 px-2 py-1 font-semibold text-muted">
                            {ARTICLE_CATEGORY_LABEL[category] ?? category}
                        </span>
                    )}
                    {tag && <span className="rounded-md bg-white/5 px-2 py-1 font-semibold text-muted">#{tag}</span>}
                    <Link href="/bai-viet" className="font-semibold text-amber hover:underline">
                        ✕ {commonT("clearFilters")}
                    </Link>
                </div>
            )}

            {loadError ? (
                <div className="mt-10">
                    <EmptyState title={articlesT("loadError")} description={commonT("tryAgain")} />
                </div>
            ) : result.items.length === 0 ? (
                <div className="mt-10">
                    <EmptyState title={articlesT("empty")} description={articlesT("emptyDescription")} />
                </div>
            ) : (
                <>
                    <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {result.items.map((article, index) => (
                            <ArticleCard key={article.id} article={article} priority={index === 0} />
                        ))}
                    </div>
                    <Pagination pagination={result.pagination} buildHref={buildHref} />
                </>
            )}
        </div>
    );
}
