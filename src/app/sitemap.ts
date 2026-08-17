import type { MetadataRoute } from "next";
import { createSiteUrl } from "@/config/site";
import { ArticleService } from "@/modules/articles/article.service";
import type { ArticleListItem, Paginated } from "@/lib/api/types";

export const dynamic = "force-dynamic";

const articleService = new ArticleService();

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const urls: MetadataRoute.Sitemap = [
        {
            url: createSiteUrl("/").toString(),
            changeFrequency: "daily",
            priority: 1,
        },
        {
            url: createSiteUrl("/venues").toString(),
            changeFrequency: "daily",
            priority: 0.9,
        },
        {
            url: createSiteUrl("/events").toString(),
            changeFrequency: "daily",
            priority: 0.9,
        },
        {
            url: createSiteUrl("/happy-hour").toString(),
            changeFrequency: "daily",
            priority: 0.8,
        },
        {
            url: createSiteUrl("/bai-viet").toString(),
            changeFrequency: "daily",
            priority: 0.8,
        },
    ];

    try {
        const result = await articleService.listPublicArticles(
            new URLSearchParams({ page: "1", limit: "200" })
        ) as Paginated<ArticleListItem>;

        urls.push(
            ...result.items.map((article) => ({
                url: createSiteUrl(`/bai-viet/${article.slug}`).toString(),
                lastModified: article.updated_at,
                changeFrequency: "weekly" as const,
                priority: article.is_featured ? 0.8 : 0.7,
            }))
        );
    } catch {
        return urls;
    }

    return urls;
}
