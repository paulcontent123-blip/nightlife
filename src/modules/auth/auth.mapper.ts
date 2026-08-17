import type { Session } from "@supabase/supabase-js";
import type { AuthSessionPayload, AuthorizationPayload, UserProfile, UserRole, UserRow } from "./auth.types";

const USER_ROLES: UserRole[] = ["user", "admin", "venue_owner"];

export function mapUserProfile(row: UserRow): UserProfile {
    return {
        id: row.id,
        email: row.email,
        display_name: row.display_name,
        full_name: row.full_name ?? null,
        avatar_url: row.avatar_url ?? null,
        phone: row.phone ?? null,
        city: row.city ?? "hcm",
        role: mapUserRole(row.role),
        membership_tier: row.membership_tier ?? "free",
        nightlife_passport_points: row.nightlife_passport_points ?? 0,
    };
}

export function mapSession(session: Session | null): AuthSessionPayload | null {
    if (!session) {
        return null;
    }

    return {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        token_type: session.token_type,
        expires_in: session.expires_in,
        expires_at: session.expires_at,
    };
}

export function mapAuthorization(user: UserProfile): AuthorizationPayload {
    return {
        role: user.role,
        is_admin: user.role === "admin",
        can_access_admin: user.role === "admin",
        redirect_to: getRoleRedirectPath(user.role),
    };
}

export function getRoleRedirectPath(role: UserRole): string {
    return role === "admin" ? "/admin/dashboard" : "/";
}

function mapUserRole(role: string | null | undefined): UserRole {
    if (USER_ROLES.includes(role as UserRole)) {
        return role as UserRole;
    }

    return "user";
}
