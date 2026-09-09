import { ArticleListService } from "@/modules/articles/article-list.service";
import { AuthException } from "@/modules/auth/auth.errors";
import type { ArticleListItem } from "@/lib/api/types";
import { ArticleCard } from "@/components/articles/ArticleCard";

const articleListService = new ArticleListService();

interface RelatedArticlesProps {
    articleId: string;
    category: string;
    relatedArticleIds: string[];
}

export async function RelatedArticles({ articleId, category, relatedArticleIds }: RelatedArticlesProps) {
    let items: ArticleListItem[] = [];

    try {
        // Admin-curated picks take priority; only fall back to an automatic
        // same-category suggestion when nothing has been picked (or the picks
        // no longer resolve — e.g. an article got unpublished since).
        if (relatedArticleIds.length > 0) {
            items = await articleListService.listPublicArticlesByIds(relatedArticleIds);
        }

        if (items.length === 0) {
            const result = await articleListService.listPublicArticles(
                new URLSearchParams({ category, limit: "4" })
            );

            items = result.items.filter((article) => article.id !== articleId).slice(0, 3);
        }
    } catch (error) {
        if (!(error instanceof AuthException)) {
            throw error;
        }
    }

    if (items.length === 0) {
        return null;
    }

    return (
        <section className="mt-12 border-t border-border pt-8">
            <div className="mb-5 flex items-end justify-between gap-4">
                <div>
                    <p className="text-xs font-bold uppercase text-amber">Khám phá thêm</p>
                    <h2 className="mt-1 font-display text-xl font-extrabold text-white">Bài viết liên quan</h2>
                </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {items.map((article) => (
                    <ArticleCard key={article.id} article={article} />
                ))}
            </div>
        </section>
    );
}
