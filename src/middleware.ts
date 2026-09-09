import { NextRequest, NextResponse } from "next/server";
import { adminRouteGuard } from "@/middleware/auth";
import {
    appendRateLimitHeaders,
    checkPublicApiRateLimit,
} from "@/middleware/rate-limit";

export async function middleware(request: NextRequest) {
    const pathname = request.nextUrl.pathname;

    if (pathname.startsWith("/api/v1")) {
        if (isTrustedInternalFetch(request)) {
            return NextResponse.next();
        }

        const rateLimitResult = await checkPublicApiRateLimit(request);

        if (!rateLimitResult.allowed) {
            return appendRateLimitHeaders(
                NextResponse.json(
                    {
                        success: false,
                        error: {
                            code: "PUBLIC_RATE_LIMIT_EXCEEDED",
                            message: "Too many requests. Please try again later.",
                        },
                    },
                    { status: 429 }
                ),
                rateLimitResult
            );
        }

        return appendRateLimitHeaders(NextResponse.next(), rateLimitResult);
    }

    if (pathname.startsWith("/admin")) {
        return adminRouteGuard(request);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/api/v1/:path*", "/admin/:path*"],
};

function isTrustedInternalFetch(request: NextRequest) {
    const header = request.headers.get("x-nightlife-internal-fetch");
    const secret = process.env.INTERNAL_API_SECRET;

    if (!header) {
        return false;
    }

    if (process.env.NODE_ENV !== "production") {
        return header === "dev-internal-fetch";
    }

    return Boolean(secret) && header === secret;
}
