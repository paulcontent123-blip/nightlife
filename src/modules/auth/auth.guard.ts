import { AuthService } from "./auth.service";
import { AuthException } from "./auth.errors";
import { hasSupabaseAuthCookie } from "@/lib/supabase/server";
import type { UserProfile, UserRole } from "./auth.types";

export async function requireAuth(): Promise<UserProfile> {
    if (!(await hasSupabaseAuthCookie())) {
        throw new AuthException(401, "UNAUTHORIZED");
    }

    const authService = new AuthService();

    return authService.me();
}

export async function requireRole(allowedRoles: UserRole[]): Promise<UserProfile> {
    const authService = new AuthService();

    return authService.requireRole(allowedRoles);
}

export async function requireAdmin(): Promise<UserProfile> {
    return requireRole(["admin"]);
}
