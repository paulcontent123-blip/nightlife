import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArticleService } from "@/modules/articles/article.service";
import { serverFetch } from "@/lib/api/server";
import { ApiError } from "@/lib/api/envelope";
import { createSiteUrl } from "@/config/site";
import type { ArticleDetail } from "@/lib/api/types";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { MarkdownContent } from "@/components/articles/MarkdownContent";
import { RelatedArticles } from "@/components/articles/RelatedArticles";
import { ARTICLE_CATEGORY_LABEL } from "@/lib/format";

interface PageProps {
    params: Promise<{ slug: string }>;
}

const articleService = new ArticleService();

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params;

    try {
        const article = await articleService.getPublicArticleMetaBySlug(slug);
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
    let article: ArticleDetail;

    try {
        article = await serverFetch<ArticleDetail>(`/api/v1/bai-viet/${slug}`);
    } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
            notFound();
        }

        throw error;
    }

    return (
        <article className="mx-auto max-w-4xl px-5 py-16 sm:px-10">
            <Link href="/bai-viet" className="text-sm font-semibold text-muted hover:text-amber">
                ← Quay lại danh sách bài viết
            </Link>

            <header className="mt-6">
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
                    className="mt-8 aspect-[16/9] w-full rounded-xl border border-border object-cover"
                />
            )}

            <Card className="mt-8 p-5 sm:p-8">
                <MarkdownContent content={article.content} />
            </Card>

            {article.tags.length > 0 && (
                <div className="mt-6 flex flex-wrap gap-2">
                    {article.tags.map((tag) => (
                        <Link key={tag} href={`/bai-viet?tag=${encodeURIComponent(tag)}`}>
                            <Badge tone="gray">#{tag}</Badge>
                        </Link>
                    ))}
                </div>
            )}

            <RelatedArticles category={article.category} excludeSlug={article.slug} />

            {article.structured_data && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(article.structured_data) }}
                />
            )}
        </article>
    );
}
