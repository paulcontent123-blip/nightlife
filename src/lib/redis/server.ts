interface RedisRestConfig {
    url: string;
    token: string;
}

type RedisCommandResult = {
    result?: unknown;
    error?: string;
};

export async function redisJsonGet<T>(key: string): Promise<T | null> {
    const redis = getRedisRestConfig();

    if (!redis) {
        return null;
    }

    const [response] = await executeRedisPipeline(redis, [["GET", key]]);
    const value = response?.result;

    if (typeof value !== "string") {
        return null;
    }

    return JSON.parse(value) as T;
}

export async function redisJsonSet<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    const redis = getRedisRestConfig();

    if (!redis) {
        return;
    }

    await executeRedisPipeline(redis, [
        ["SET", key, JSON.stringify(value), "EX", ttlSeconds],
    ]);
}

export async function redisGetNumber(key: string): Promise<number | null> {
    const redis = getRedisRestConfig();

    if (!redis) {
        return null;
    }

    const [response] = await executeRedisPipeline(redis, [["GET", key]]);
    const value = response?.result;
    const numberValue = typeof value === "number" ? value : Number(value);

    return Number.isFinite(numberValue) ? numberValue : null;
}

export async function redisIncrement(key: string): Promise<number | null> {
    const redis = getRedisRestConfig();

    if (!redis) {
        return null;
    }

    const [response] = await executeRedisPipeline(redis, [["INCR", key]]);
    const value = response?.result;
    const numberValue = typeof value === "number" ? value : Number(value);

    return Number.isFinite(numberValue) ? numberValue : null;
}

export async function redisIncrementBy(key: string, amount: number): Promise<number | null> {
    const redis = getRedisRestConfig();

    if (!redis) {
        return null;
    }

    const [response] = await executeRedisPipeline(redis, [["INCRBY", key, amount]]);
    const value = response?.result;
    const numberValue = typeof value === "number" ? value : Number(value);

    return Number.isFinite(numberValue) ? numberValue : null;
}

export async function redisSetAdd(key: string, member: string, ttlSeconds?: number): Promise<void> {
    const redis = getRedisRestConfig();

    if (!redis) {
        return;
    }

    await executeRedisPipeline(redis, [
        ["SADD", key, member],
        ...(ttlSeconds ? [["EXPIRE", key, ttlSeconds] as Array<string | number>] : []),
    ]);
}

export async function redisSetMembers(key: string): Promise<string[]> {
    const redis = getRedisRestConfig();

    if (!redis) {
        return [];
    }

    const [response] = await executeRedisPipeline(redis, [["SMEMBERS", key]]);
    const value = response?.result;

    return Array.isArray(value)
        ? value.filter((item): item is string => typeof item === "string")
        : [];
}

export async function redisSetRemove(key: string, members: string[]): Promise<void> {
    const redis = getRedisRestConfig();

    if (!redis || members.length === 0) {
        return;
    }

    await executeRedisPipeline(redis, [["SREM", key, ...members]]);
}

export async function redisDelete(keys: string[]): Promise<void> {
    const redis = getRedisRestConfig();

    if (!redis || keys.length === 0) {
        return;
    }

    await executeRedisPipeline(redis, [["DEL", ...keys]]);
}

async function executeRedisPipeline(
    redis: RedisRestConfig,
    commands: Array<Array<string | number>>
): Promise<RedisCommandResult[]> {
    const response = await fetch(`${redis.url.replace(/\/$/, "")}/pipeline`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${redis.token}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(commands),
        cache: "no-store",
    });

    if (!response.ok) {
        throw new Error(`Redis cache request failed with status ${response.status}`);
    }

    const body = await response.json() as RedisCommandResult[];
    const failedCommand = body.find((item) => item.error);

    if (failedCommand?.error) {
        throw new Error(failedCommand.error);
    }

    return body;
}

function getRedisRestConfig(): RedisRestConfig | null {
    const redisUrl =
        process.env.REDIS_REST_URL ??
        process.env.UPSTASH_REDIS_REST_URL ??
        readHttpRedisUrl(process.env.REDIS_URL);
    const redisToken =
        process.env.REDIS_REST_TOKEN ??
        process.env.UPSTASH_REDIS_REST_TOKEN ??
        process.env.REDIS_TOKEN;

    if (!redisUrl || !redisToken) {
        return null;
    }

    return {
        url: redisUrl,
        token: redisToken,
    };
}

function readHttpRedisUrl(redisUrl: string | undefined): string | undefined {
    if (!redisUrl?.startsWith("http")) {
        return undefined;
    }

    return redisUrl;
}
