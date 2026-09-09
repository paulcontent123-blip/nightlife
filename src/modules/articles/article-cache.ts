import { redisIncrement } from "@/lib/redis/server";

export const ARTICLE_LIST_CACHE_VERSION_KEY = "cache:articles:list:version";

export async function incrementArticleListCacheVersion() {
    try {
        await redisIncrement(ARTICLE_LIST_CACHE_VERSION_KEY);
    } catch {
        // Cache invalidation failure must not block article mutations.
    }
}
