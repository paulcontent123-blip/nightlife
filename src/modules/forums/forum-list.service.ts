import { redisGetVersionAndJson, redisJsonSet } from "@/lib/redis/server";
import { ForumRepository } from "./forum.repository";
import { FORUM_LIST_CACHE_VERSION_KEY } from "./forum-cache";
import { ForumPostListQuerySchema } from "./forum.validator";

const CACHE_TTL_SECONDS = 60;

type PublicForumListResult = Awaited<ReturnType<ForumRepository["listPublicPosts"]>>;

interface CachedForumListEntry {
    version: number;
    data: PublicForumListResult;
}

export class ForumListService {
    constructor(private repository = new ForumRepository()) { }

    async listPublicPosts(searchParams: URLSearchParams) {
        const query = ForumPostListQuerySchema.parse(Object.fromEntries(searchParams));

        return this.getCached(
            this.createCacheKey(query),
            () => this.repository.listPublicPosts(query)
        );
    }

    private async getCached(
        key: string,
        load: () => Promise<PublicForumListResult>
    ) {
        let version = 0;
        let redisAvailable = false;

        try {
            const cached = await redisGetVersionAndJson<CachedForumListEntry>(
                FORUM_LIST_CACHE_VERSION_KEY,
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
            // Cache failures must not block the public forum.
        }

        return data;
    }

    private createCacheKey(query: Awaited<ReturnType<typeof ForumPostListQuerySchema.parse>>) {
        return `cache:forum:posts:${JSON.stringify(query)}`;
    }
}
