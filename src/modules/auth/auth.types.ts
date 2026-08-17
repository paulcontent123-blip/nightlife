export type UserRole = "user" | "admin" | "venue_owner";

export interface RegisterDTO {
    email: string;
    password: string;
    display_name: string;
}

export interface LoginDTO {
    email: string;
    password: string;
}

export interface UpdateProfileDTO {
    display_name?: string;
    full_name?: string;
    phone?: string;
    city?: "hcm" | "hanoi" | "danang";
    avatar_url?: string;
}

export interface GoogleOAuthDTO {
    redirect_to?: string;
}

export interface UserProfile {
    id: string;
    email: string;
    display_name: string;
    full_name: string | null;
    avatar_url: string | null;
    phone: string | null;
    city: string;
    role: UserRole;
    membership_tier: string;
    nightlife_passport_points: number;
}

export interface UserRow extends UserProfile {
    created_at?: string;
    membership_expires_at?: string | null;
    password_hash?: string | null;
}

export interface AuthSessionPayload {
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: number;
    expires_at?: number;
}

export interface AuthorizationPayload {
    role: UserRole;
    is_admin: boolean;
    can_access_admin: boolean;
    redirect_to: string;
}

export interface AuthResponse {
    user: UserProfile;
    session: AuthSessionPayload | null;
    authorization: AuthorizationPayload;
    redirect_to: string;
}

export interface OAuthResponse {
    provider: "google";
    url: string;
}
