import { redisIncrement } from "@/lib/redis/server";

export const FORUM_LIST_CACHE_VERSION_KEY = "cache:forum:posts:version";

export async function incrementForumListCacheVersion() {
    try {
        await redisIncrement(FORUM_LIST_CACHE_VERSION_KEY);
    } catch {
        // Cache invalidation failure must not block forum mutations.
    }
}
