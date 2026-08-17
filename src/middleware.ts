import { NextRequest, NextResponse } from "next/server";
import { adminRouteGuard } from "@/middleware/auth";
import {
    attachPublicRateLimitHeaders,
    publicRateLimit,
} from "@/middleware/rate-limit";

export async function middleware(request: NextRequest) {
    const pathname = request.nextUrl.pathname;

    if (pathname.startsWith("/api/v1")) {
        const rateLimitResponse = await publicRateLimit(request);

        if (rateLimitResponse) {
            return rateLimitResponse;
        }

        return attachPublicRateLimitHeaders(NextResponse.next(), request);
    }

    if (pathname.startsWith("/admin")) {
        return adminRouteGuard(request);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/api/v1/:path*", "/admin/:path*"],
};
