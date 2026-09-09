import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { cache } from "react";
import { ArticleService } from "@/modules/articles/article.service";
import { AuthException } from "@/modules/auth/auth.errors";
import { createSiteUrl } from "@/config/site";
import type { ArticleDetail } from "@/lib/api/types";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { extractMarkdownHeadings, MarkdownContent } from "@/components/articles/MarkdownContent";
import { ArticleTableOfContents } from "@/components/articles/ArticleTableOfContents";
import { RelatedArticles } from "@/components/articles/RelatedArticles";
import { ARTICLE_CATEGORY_LABEL } from "@/lib/format";

interface PageProps {
    params: Promise<{ slug: string }>;
}

const articleService = new ArticleService();

// Metadata and page rendering use the same request-scoped result, avoiding a
// second Redis/Supabase read for the same article.
const getArticle = cache(async (slug: string): Promise<ArticleDetail | null> => {
    try {
        return await articleService.getPublicArticleBySlug(slug);
    } catch (error) {
        if (error instanceof AuthException && error.status === 404) {
            return null;
        }

        throw error;
    }
});

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params;

    try {
        const article = await getArticle(slug);

        if (!article) {
            return {
                title: "Bài viết không tồn tại · Nightlife.vn",
            };
        }

        const title = article.seo.meta_title ?? article.title;
        const description = article.seo.meta_description ?? article.excerpt ?? undefined;
        const canonical = article.seo.canonical_url ?? createSiteUrl(`/bai-viet/${article.slug}`).toString();

        return {
            title,
            description,
            alternates: { canonical },
            openGraph: {
                title,
                description,
                type: "article",
                url: canonical,
                images: article.seo.og_image_url ? [article.seo.og_image_url] : undefined,
                publishedTime: article.published_at ?? undefined,
                modifiedTime: article.updated_at,
            },
        };
    } catch {
        return {
            title: "Bài viết không tồn tại · Nightlife.vn",
        };
    }
}

export default async function ArticleDetailPage({ params }: PageProps) {
    const { slug } = await params;
    const article = await getArticle(slug);

    if (!article) {
        notFound();
    }

    const headings = extractMarkdownHeadings(article.content);

    return (
        <article className="mx-auto max-w-6xl px-5 py-16 sm:px-10">
            <Link href="/bai-viet" className="text-sm font-semibold text-muted hover:text-amber">
                ← Quay lại danh sách bài viết
            </Link>

            <header className="mt-6 max-w-4xl">
                <div className="mb-4 flex flex-wrap gap-2">
                    <Badge tone="amber">{ARTICLE_CATEGORY_LABEL[article.category] ?? article.category}</Badge>
                    {article.city && <Badge tone="cyan">{article.city}</Badge>}
                    {article.target_keyword && <Badge tone="gray">{article.target_keyword}</Badge>}
                </div>
                <h1 className="font-display text-4xl font-extrabold leading-tight text-white md:text-5xl">
                    {article.title}
                </h1>
                {article.excerpt && (
                    <p className="mt-5 text-lg leading-8 text-muted">
                        {article.excerpt}
                    </p>
                )}
                <div className="mt-5 flex flex-wrap gap-3 text-xs text-muted-2">
                    <span>{article.reading_time_minutes} phút đọc</span>
                    <span>{article.view_count} lượt xem</span>
                    {article.published_at && <span>{new Date(article.published_at).toLocaleDateString("vi-VN")}</span>}
                </div>
            </header>

            {article.seo.og_image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={article.seo.og_image_url}
                    alt={article.title}
                    className="mt-8 aspect-[16/9] w-full max-w-4xl rounded-lg border border-border object-cover"
                />
            )}

            {headings.length > 0 && (
                <div className="mt-8 lg:hidden">
                    <ArticleTableOfContents headings={headings} collapsible />
                </div>
            )}

            <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_240px]">
                <Card className="min-w-0 p-5 sm:p-8">
                    <MarkdownContent content={article.content} />
                </Card>
                {headings.length > 0 && (
                    <aside className="sticky top-24 hidden max-h-[calc(100vh-8rem)] overflow-y-auto border-l border-border pl-5 lg:block">
                        <ArticleTableOfContents headings={headings} />
                    </aside>
                )}
            </div>

            {article.tags.length > 0 && (
                <div className="mt-6 flex flex-wrap gap-2">
                    {article.tags.map((tag) => (
                        <Link key={tag} href={`/bai-viet?tag=${encodeURIComponent(tag)}`}>
                            <Badge tone="gray">#{tag}</Badge>
                        </Link>
                    ))}
                </div>
            )}

            {/* Streamed separately so the article body renders immediately instead
                of waiting on the related-articles query, which genuinely depends
                on this article's data and can't be fetched in parallel. */}
            <Suspense fallback={<RelatedArticlesSkeleton />}>
                <RelatedArticles
                    articleId={article.id}
                    category={article.category}
                    relatedArticleIds={article.related_article_ids}
                />
            </Suspense>

            {article.structured_data && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(article.structured_data) }}
                />
            )}
        </article>
    );
}

function RelatedArticlesSkeleton() {
    return (
        <div className="mt-12" aria-hidden="true">
            <div className="mb-4 h-6 w-48 animate-pulse rounded bg-white/10" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {Array.from({ length: 3 }, (_, index) => (
                    <div key={index} className="h-56 animate-pulse rounded-xl border border-border bg-void-2" />
                ))}
            </div>
        </div>
    );
}
