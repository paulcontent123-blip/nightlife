import { redisGetNumber, redisIncrement } from "@/lib/redis/server";

export const EVENT_LIST_CACHE_VERSION_KEY = "cache:events:list:version";

export async function readEventListCacheVersion() {
    try {
        return await redisGetNumber(EVENT_LIST_CACHE_VERSION_KEY) ?? 0;
    } catch {
        return 0;
    }
}

export async function incrementEventListCacheVersion() {
    try {
        await redisIncrement(EVENT_LIST_CACHE_VERSION_KEY);
    } catch {
        // Cache invalidation failure must not block event mutations.
    }
}
