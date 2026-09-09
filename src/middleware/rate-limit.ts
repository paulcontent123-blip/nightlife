import { NextRequest, NextResponse } from "next/server";
import { RATE_LIMIT } from "@/constants/rate-limit";

interface RateLimitResult {
    allowed: boolean;
    limit: number;
    remaining: number;
    resetAt: number;
    retryAfter: number;
    store: "redis" | "disabled";
}

interface RedisRestConfig {
    url: string;
    token: string;
}

type RedisCommandResult = {
    result?: unknown;
    error?: string;
};

const REDIS_REQUEST_TIMEOUT_MS = 800;

export async function publicRateLimit(request: NextRequest): Promise<NextResponse | null> {
    const result = await checkPublicApiRateLimit(request);

    if (!result.allowed) {
        return rateLimitExceededResponse(result, "PUBLIC_RATE_LIMIT_EXCEEDED");
    }

    return null;
}

export async function checkPublicApiRateLimit(request: NextRequest): Promise<RateLimitResult> {
    const ip = getClientIp(request);

    return checkRedisRateLimit(
        `public:${ip}`,
        RATE_LIMIT.PUBLIC_API.limit,
        RATE_LIMIT.PUBLIC_API.window
    );
}

export async function uploadRateLimit(userId: string): Promise<NextResponse | null> {
    const result = await checkRedisRateLimit(
        `avatar:${userId}`,
        RATE_LIMIT.UPLOAD_AVATAR.limit,
        RATE_LIMIT.UPLOAD_AVATAR.window
    );

    if (!result.allowed) {
        return rateLimitExceededResponse(result, "AVATAR_RATE_LIMIT_EXCEEDED");
    }

    return null;
}

export async function bookingRateLimit(userId: string): Promise<NextResponse | null> {
    const result = await checkRedisRateLimit(
        `booking:${userId}`,
        RATE_LIMIT.BOOKING.limit,
        RATE_LIMIT.BOOKING.window
    );

    if (!result.allowed) {
        return rateLimitExceededResponse(result, "BOOKING_RATE_LIMIT_EXCEEDED");
    }

    return null;
}

export async function forumPostRateLimit(userId: string): Promise<NextResponse | null> {
    const result = await checkRedisRateLimit(
        `forum-post:${userId}`,
        RATE_LIMIT.FORUM_POST.limit,
        RATE_LIMIT.FORUM_POST.window
    );

    if (!result.allowed) {
        return rateLimitExceededResponse(result, "FORUM_POST_RATE_LIMIT_EXCEEDED");
    }

    return null;
}

export async function attachPublicRateLimitHeaders(
    response: NextResponse,
    request: NextRequest
): Promise<NextResponse> {
    const ip = getClientIp(request);
    const result = await readRedisRateLimit(
        `public:${ip}`,
        RATE_LIMIT.PUBLIC_API.limit,
        RATE_LIMIT.PUBLIC_API.window
    );

    Object.entries(createRateLimitHeaders(result)).forEach(([key, value]) => {
        response.headers.set(key, value);
    });

    return response;
}

export const applyPublicApiRateLimit = publicRateLimit;
export const attachRateLimitHeaders = attachPublicRateLimitHeaders;

async function checkRedisRateLimit(
    key: string,
    limit: number,
    windowSeconds: number
): Promise<RateLimitResult> {
    const redis = getRedisRestConfig();

    if (!redis) {
        return createDisabledResult(limit, windowSeconds);
    }

    let response: RedisCommandResult[];

    try {
        response = await executeRedisPipeline(redis, [
            ["INCR", key],
            ["EXPIRE", key, windowSeconds, "NX"],
            ["TTL", key],
        ]);
    } catch {
        // A cache outage must not make a public endpoint unavailable.
        return createDisabledResult(limit, windowSeconds);
    }

    const count = Number(response[0]?.result ?? 0);
    const ttl = normalizeTtl(Number(response[2]?.result), windowSeconds);
    const resetAt = Date.now() + ttl * 1000;
    const allowed = count <= limit;

    return {
        allowed,
        limit,
        remaining: Math.max(limit - count, 0),
        resetAt,
        retryAfter: allowed ? 0 : ttl,
        store: "redis",
    };
}

async function readRedisRateLimit(
    key: string,
    limit: number,
    windowSeconds: number
): Promise<RateLimitResult> {
    const redis = getRedisRestConfig();

    if (!redis) {
        return createDisabledResult(limit, windowSeconds);
    }

    let response: RedisCommandResult[];

    try {
        response = await executeRedisPipeline(redis, [
            ["GET", key],
            ["TTL", key],
        ]);
    } catch {
        return createDisabledResult(limit, windowSeconds);
    }

    const count = Number(response[0]?.result ?? 0);
    const ttl = normalizeTtl(Number(response[1]?.result), windowSeconds);
    const resetAt = Date.now() + ttl * 1000;
    const allowed = count < limit;

    return {
        allowed,
        limit,
        remaining: Math.max(limit - count, 0),
        resetAt,
        retryAfter: allowed ? 0 : ttl,
        store: "redis",
    };
}

async function executeRedisPipeline(
    redis: RedisRestConfig,
    commands: Array<Array<string | number>>
): Promise<RedisCommandResult[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REDIS_REQUEST_TIMEOUT_MS);

    try {
        const response = await fetch(`${redis.url.replace(/\/$/, "")}/pipeline`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${redis.token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(commands),
            cache: "no-store",
            signal: controller.signal,
        });

        if (!response.ok) {
            throw new Error(`Redis rate limit request failed with status ${response.status}`);
        }

        const body = await response.json() as RedisCommandResult[];
        const failedCommand = body.find((item) => item.error);

        if (failedCommand?.error) {
            throw new Error(failedCommand.error);
        }

        return body;
    } finally {
        clearTimeout(timeout);
    }
}

function rateLimitExceededResponse(result: RateLimitResult, code: string): NextResponse {
    return NextResponse.json(
        {
            success: false,
            error: {
                code,
                message: "Too many requests. Please try again later.",
            },
        },
        {
            status: 429,
            headers: createRateLimitHeaders(result),
        }
    );
}

function createRateLimitHeaders(result: RateLimitResult): Record<string, string> {
    return {
        "X-RateLimit-Limit": result.limit.toString(),
        "X-RateLimit-Remaining": result.remaining.toString(),
        "X-RateLimit-Reset": Math.ceil(result.resetAt / 1000).toString(),
        "X-RateLimit-Store": result.store,
        ...(result.retryAfter > 0 ? { "Retry-After": result.retryAfter.toString() } : {}),
    };
}

export function appendRateLimitHeaders(response: NextResponse, result: RateLimitResult): NextResponse {
    Object.entries(createRateLimitHeaders(result)).forEach(([key, value]) => {
        response.headers.set(key, value);
    });

    return response;
}

function getClientIp(request: NextRequest): string {
    const forwardedFor = request.headers.get("x-forwarded-for");

    if (forwardedFor) {
        return forwardedFor.split(",")[0]?.trim() || "unknown";
    }

    return (
        request.headers.get("x-real-ip") ??
        request.headers.get("cf-connecting-ip") ??
        "unknown"
    );
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

function normalizeTtl(ttl: number, windowSeconds: number): number {
    if (!Number.isFinite(ttl) || ttl <= 0) {
        return windowSeconds;
    }

    return ttl;
}

function createDisabledResult(limit: number, windowSeconds: number): RateLimitResult {
    return {
        allowed: true,
        limit,
        remaining: limit,
        resetAt: Date.now() + windowSeconds * 1000,
        retryAfter: 0,
        store: "disabled",
    };
}
