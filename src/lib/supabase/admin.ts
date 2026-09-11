import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_REQUEST_TIMEOUT_MS = 5_000;
let cachedAdminClient: SupabaseClient | null = null;

export function createAdminClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error("Missing Supabase admin environment variables");
    }

    if (cachedAdminClient) {
        return cachedAdminClient;
    }

    cachedAdminClient = createClient(supabaseUrl, serviceRoleKey, {
        global: {
            fetch: fetchWithTimeout,
        },
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });

    return cachedAdminClient;
}

async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), SUPABASE_REQUEST_TIMEOUT_MS);

    try {
        const response = await fetch(input, {
            ...init,
            signal: controller.signal,
        });

        const method = init?.method ?? (input instanceof Request ? input.method : undefined);

        return normalizeEmptyPostgrestRange(response, method);
    } finally {
        clearTimeout(timeout);
    }
}

async function normalizeEmptyPostgrestRange(response: Response, method?: string) {
    const requestMethod = (method ?? "GET").toUpperCase();

    if (
        !["GET", "HEAD"].includes(requestMethod)
        || response.status !== 416
        || !response.headers.get("content-range")?.startsWith("*/")
    ) {
        return response;
    }

    const error = await response.clone().json().catch(() => null) as { code?: string } | null;

    if (error?.code !== "PGRST103") {
        return response;
    }

    // PostgREST returns 416 when a page starts past the final row. Its
    // Content-Range header still contains the exact total, so expose this as
    // a successful empty page without issuing a second COUNT query.
    const headers = new Headers(response.headers);
    headers.delete("content-encoding");
    headers.delete("content-length");

    return new Response(requestMethod === "HEAD" ? null : "[]", {
        status: 200,
        statusText: "OK",
        headers,
    });
}
