import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
    const cookieStore = await cookies();

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        cookieStore.set(name, value, options)
                    );
                },
            },
        }
    );
}

// Avoid a network call to Supabase Auth when the request has no session cookie.
export async function hasSupabaseAuthCookie() {
    const cookieStore = await cookies();

    return cookieStore.getAll().some(({ name }) => (
        name.startsWith("sb-") && name.includes("-auth-token")
    ));
}
