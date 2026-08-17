import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import type { UserRole } from "@/modules/auth/auth.types";

interface UserRoleRow {
    role: UserRole | null;
}

export async function adminRouteGuard(request: NextRequest): Promise<NextResponse> {
    let response = NextResponse.next({
        request,
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));

                    response = NextResponse.next({
                        request,
                    });

                    cookiesToSet.forEach(({ name, value, options }) => {
                        response.cookies.set(name, value, options);
                    });
                },
            },
        }
    );

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
        return NextResponse.redirect(new URL("/", request.url));
    }

    const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", userData.user.id)
        .maybeSingle<UserRoleRow>();

    if (profile?.role !== "admin") {
        return NextResponse.redirect(new URL("/403", request.url));
    }

    return response;
}
