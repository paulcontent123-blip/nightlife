import { redisGetNumber, redisIncrement } from "@/lib/redis/server";

const VENUE_LIST_CACHE_VERSION_KEY = "cache:venues:list:version";
const VENUE_AVAILABILITY_CACHE_VERSION_KEY_PREFIX = "cache:venues:availability:version";

export async function readVenueListCacheVersion() {
    return readCacheVersion(VENUE_LIST_CACHE_VERSION_KEY);
}

export async function incrementVenueListCacheVersion() {
    await incrementCacheVersion(VENUE_LIST_CACHE_VERSION_KEY);
}

export async function readVenueAvailabilityCacheVersion(venueId: string) {
    return readCacheVersion(createVenueAvailabilityVersionKey(venueId));
}

export async function incrementVenueAvailabilityCacheVersion(venueId: string) {
    await incrementCacheVersion(createVenueAvailabilityVersionKey(venueId));
}

function createVenueAvailabilityVersionKey(venueId: string) {
    return `${VENUE_AVAILABILITY_CACHE_VERSION_KEY_PREFIX}:${venueId}`;
}

async function readCacheVersion(key: string) {
    try {
        return await redisGetNumber(key) ?? 0;
    } catch {
        return 0;
    }
}

async function incrementCacheVersion(key: string) {
    try {
        await redisIncrement(key);
    } catch {
        // Cache invalidation failure should not block admin mutations.
    }
}
