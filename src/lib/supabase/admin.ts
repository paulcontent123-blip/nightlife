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
        return await fetch(input, {
            ...init,
            signal: controller.signal,
        });
    } finally {
        clearTimeout(timeout);
    }
}
