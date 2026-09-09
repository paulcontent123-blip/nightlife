import { redisGetVersionAndJson, redisJsonSet } from "@/lib/redis/server";
import { AuthException } from "@/modules/auth/auth.errors";
import { VenueRepository } from "@/modules/venues/venue.repository";
import { EventRepository } from "./event.repository";
import { EVENT_LIST_CACHE_VERSION_KEY } from "./event-cache";
import { EventListQuerySchema } from "./event.validator";

const CACHE_TTL_SECONDS = 300;

type PublicEventListResult = Awaited<ReturnType<EventRepository["listPublic"]>>;

interface CachedEventListEntry {
    version: number;
    data: PublicEventListResult;
}

export class EventListService {
    constructor(
        private repository = new EventRepository(),
        private venueRepository = new VenueRepository()
    ) { }

    async listPublicEvents(searchParams: URLSearchParams) {
        const query = EventListQuerySchema.parse(Object.fromEntries(searchParams));

        return this.getCached(
            this.createCacheKey("all", query),
            () => this.repository.listPublic(query)
        );
    }

    async listPublicVenueEvents(venueSlug: string, searchParams: URLSearchParams) {
        const venue = await this.venueRepository.findBySlug(venueSlug, true);

        if (!venue) {
            throw new AuthException(404, "VENUE_NOT_FOUND");
        }

        return this.listPublicVenueEventsById(venue.id, searchParams);
    }

    // Internal callers that already loaded the venue can skip a duplicate
    // venue lookup before reading its public events.
    async listPublicVenueEventsById(venueId: string, searchParams: URLSearchParams) {
        const query = EventListQuerySchema.parse(Object.fromEntries(searchParams));

        return this.getCached(
            this.createCacheKey(`venue:${venueId}`, query),
            () => this.repository.listPublicByVenue(venueId, query)
        );
    }

    private async getCached(
        key: string,
        load: () => Promise<PublicEventListResult>
    ) {
        let version = 0;
        let redisAvailable = false;

        try {
            const cached = await redisGetVersionAndJson<CachedEventListEntry>(
                EVENT_LIST_CACHE_VERSION_KEY,
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

        if (!redisAvailable) {
            return data;
        }

        try {
            await redisJsonSet(key, { version, data }, CACHE_TTL_SECONDS);
        } catch {
            // Cache failures must not block the public event list.
        }

        return data;
    }

    private createCacheKey(scope: string, query: Awaited<ReturnType<typeof EventListQuerySchema.parse>>) {
        return `cache:events:list:${scope}:${JSON.stringify({
            ...query,
            is_active: true,
        })}`;
    }
}
