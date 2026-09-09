import { redisIncrement } from "@/lib/redis/server";

export const BAR_TOUR_CACHE_VERSION_KEY = "cache:bar-tour:recommendations:version";

export async function incrementBarTourCacheVersion() {
    try {
        await redisIncrement(BAR_TOUR_CACHE_VERSION_KEY);
    } catch {
        // Cache invalidation failure must not block venue/deal/event mutations.
    }
}
