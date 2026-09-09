import { redisIncrement } from "@/lib/redis/server";

export const DEAL_LIST_CACHE_VERSION_KEY = "cache:deals:list:version";

export async function incrementDealListCacheVersion() {
    try {
        await redisIncrement(DEAL_LIST_CACHE_VERSION_KEY);
    } catch {
        // Cache invalidation failure must not block deal mutations.
    }
}
