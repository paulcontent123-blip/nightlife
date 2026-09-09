import { redisGetVersionAndJson, redisJsonSet } from "@/lib/redis/server";
import { DealRepository } from "./deal.repository";
import { DEAL_LIST_CACHE_VERSION_KEY } from "./deal-cache";
import { DealListQuerySchema } from "./deal.validator";

const CACHE_TTL_SECONDS = 60;

type PublicDealListResult = Awaited<ReturnType<DealRepository["listPublic"]>>;

interface CachedDealListEntry {
    version: number;
    data: PublicDealListResult;
}

export class DealListService {
    constructor(private repository = new DealRepository()) { }

    async listPublicDeals(searchParams: URLSearchParams, includeExclusiveDeals = false) {
        const query = DealListQuerySchema.parse(Object.fromEntries(searchParams));

        return this.getCached(
            this.createCacheKey(query, includeExclusiveDeals),
            () => this.repository.listPublic(query, includeExclusiveDeals)
        );
    }

    private async getCached(
        key: string,
        load: () => Promise<PublicDealListResult>
    ) {
        let version = 0;
        let redisAvailable = false;

        try {
            const cached = await redisGetVersionAndJson<CachedDealListEntry>(
                DEAL_LIST_CACHE_VERSION_KEY,
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

        // Avoid a second Redis request when the cache read already failed.
        if (!redisAvailable) {
            return data;
        }

        try {
            await redisJsonSet(key, { version, data }, CACHE_TTL_SECONDS);
        } catch {
            // Cache failures must not block the public deal list.
        }

        return data;
    }

    private createCacheKey(
        query: Awaited<ReturnType<typeof DealListQuerySchema.parse>>,
        includeExclusiveDeals: boolean
    ) {
        return `cache:deals:list:${includeExclusiveDeals ? "vip" : "public"}:${JSON.stringify(query)}`;
    }
}
