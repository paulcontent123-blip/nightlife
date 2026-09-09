import { redisGetVersionAndJson, redisJsonSet } from "@/lib/redis/server";
import { VENUE_LIST_CACHE_VERSION_KEY } from "./venue-cache";
import { VenueRepository } from "./venue.repository";
import { VenueListQuerySchema } from "./venue.validator";

const CACHE_TTL_SECONDS = 300;

type PublicVenueListResult = Awaited<ReturnType<VenueRepository["listVenues"]>>;

interface CachedVenueListEntry {
    version: number;
    data: PublicVenueListResult;
}

export class VenueListService {
    constructor(private repository = new VenueRepository()) { }

    async listPublicVenues(searchParams: URLSearchParams) {
        const query = VenueListQuerySchema.parse(Object.fromEntries(searchParams));
        const cacheKey = this.createCacheKey(query);

        // One Redis round trip reads both the invalidation counter and the
        // cached payload; a cache hit is only valid when its stamped version
        // still matches the current counter (bumped by admin/booking/review
        // mutations elsewhere), so this stays exact — no staleness window is
        // introduced versus the previous version-in-key-name approach.
        const { version, cached } = await this.readCache(cacheKey);

        if (cached && cached.version === version) {
            return cached.data;
        }

        const result = await this.repository.listVenues(query, true);

        await this.writeCache(cacheKey, { version, data: result });

        return result;
    }

    private createCacheKey(query: Awaited<ReturnType<typeof VenueListQuerySchema.parse>>) {
        return `cache:venues:list:${JSON.stringify({
            ...query,
            features: query.features ? [...query.features].sort() : undefined,
        })}`;
    }

    private async readCache(key: string): Promise<{ version: number; cached: CachedVenueListEntry | null }> {
        try {
            const { version, value } = await redisGetVersionAndJson<CachedVenueListEntry>(
                VENUE_LIST_CACHE_VERSION_KEY,
                key
            );

            return { version, cached: value };
        } catch {
            return { version: 0, cached: null };
        }
    }

    private async writeCache(key: string, value: CachedVenueListEntry): Promise<void> {
        try {
            await redisJsonSet(key, value, CACHE_TTL_SECONDS);
        } catch {
            // Cache failures should not block the public venue list.
        }
    }
}
