import { cookies, headers } from "next/headers";
import { getSiteUrl } from "@/config/site";
import { unwrapResponse } from "./envelope";

// Server-side fetch helper for Server Components/pages: calls this app's own
// /api/v1 routes with the incoming request's cookies forwarded so authenticated
// endpoints (auth/me, bookings/mine, admin/*) resolve the same session.
export async function serverFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
    const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
    const url = new URL(path, getRequestOrigin(headerStore));
    const response = await fetch(url, {
        ...init,
        headers: {
            ...(init.body ? { "Content-Type": "application/json" } : {}),
            ...init.headers,
            cookie: cookieStore.toString(),
        },
        cache: "no-store",
    });

    return unwrapResponse<T>(response);
}

function getRequestOrigin(headerStore: Headers) {
    const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");

    if (!host) {
        return getSiteUrl();
    }

    const protocol = headerStore.get("x-forwarded-proto")
        ?? (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");

    return `${protocol}://${host}`;
}
