import { redisGetVersionAndJson, redisJsonSet } from "@/lib/redis/server";
import { ArticleRepository } from "./article.repository";
import { ARTICLE_LIST_CACHE_VERSION_KEY } from "./article-cache";
import { PublicArticleListQuerySchema } from "./article.validator";

const CACHE_TTL_SECONDS = 300;

type PublicArticleListResult = Awaited<ReturnType<ArticleRepository["listPublic"]>>;

interface CachedArticleListEntry {
    version: number;
    data: PublicArticleListResult;
}

export class ArticleListService {
    constructor(private repository = new ArticleRepository()) { }

    async listPublicArticles(searchParams: URLSearchParams) {
        const query = PublicArticleListQuerySchema.parse(Object.fromEntries(searchParams));

        return this.getCached(
            this.createCacheKey(query),
            () => this.repository.listPublic(query)
        );
    }

    // Admin-curated related articles for a detail page — a small, id-bounded
    // lookup, so it is not worth the complexity of a cache key over it.
    async listPublicArticlesByIds(ids: string[]) {
        return this.repository.listPublicByIds(ids);
    }

    private async getCached(
        key: string,
        load: () => Promise<PublicArticleListResult>
    ) {
        let version = 0;
        let redisAvailable = false;

        try {
            const cached = await redisGetVersionAndJson<CachedArticleListEntry>(
                ARTICLE_LIST_CACHE_VERSION_KEY,
                key
            );
            version = cached.version;
            redisAvailable = true;

            if (cached.value && cached.value.version === version) {
                return cached.value.data;
            }
        } catch {
            // Redis is optional; the database remains the source of truth.
        }

        const data = await load();

        // Avoid a second slow Redis request when the cache read already failed.
        if (!redisAvailable) {
            return data;
        }

        try {
            await redisJsonSet(key, { version, data }, CACHE_TTL_SECONDS);
        } catch {
            // Cache failures must not block the public article list.
        }

        return data;
    }

    private createCacheKey(query: Awaited<ReturnType<typeof PublicArticleListQuerySchema.parse>>) {
        return `cache:articles:list:${JSON.stringify(query)}`;
    }
}
