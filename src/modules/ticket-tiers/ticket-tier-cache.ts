import { redisIncrement } from "@/lib/redis/server";

export const TICKET_TIER_LIST_CACHE_VERSION_KEY = "cache:ticket-tiers:list:version";

export async function incrementTicketTierListCacheVersion() {
    try {
        await redisIncrement(TICKET_TIER_LIST_CACHE_VERSION_KEY);
    } catch {
        // Cache invalidation failure must not block ticket-tier mutations.
    }
}
