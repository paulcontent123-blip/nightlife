import { serverFetch } from "@/lib/api/server";
import { ApiError } from "@/lib/api/envelope";
import type { ArticleListItem, Paginated } from "@/lib/api/types";
import { ArticleCard } from "@/components/articles/ArticleCard";

export async function RelatedArticles({ category, excludeSlug }: { category: string; excludeSlug: string }) {
    let items: ArticleListItem[] = [];

    try {
        const result = await serverFetch<Paginated<ArticleListItem>>(
            `/api/v1/bai-viet?category=${encodeURIComponent(category)}&limit=4`
        );

        items = result.items.filter((article) => article.slug !== excludeSlug).slice(0, 3);
    } catch (error) {
        if (!(error instanceof ApiError)) {
            throw error;
        }
    }

    if (items.length === 0) {
        return null;
    }

    return (
        <section className="mt-12">
            <p className="mb-4 font-display text-lg font-extrabold">📚 Bài viết liên quan</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {items.map((article) => (
                    <ArticleCard key={article.id} article={article} />
                ))}
            </div>
        </section>
    );
}
