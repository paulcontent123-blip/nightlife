import type { User } from "@supabase/supabase-js";
import { createClient, hasSupabaseAuthCookie } from "@/lib/supabase/server";
import { AuthCache } from "./auth.cache";
import { AuthError, AuthException } from "./auth.errors";
import { getRoleRedirectPath, mapAuthorization, mapSession } from "./auth.mapper";
import { AuthRepository } from "./auth.repository";
import {
    GoogleOAuthSchema,
    LoginSchema,
    RegisterSchema,
    UpdateProfileSchema,
} from "./auth.validator";
import type {
    AuthResponse,
    GoogleOAuthDTO,
    LoginDTO,
    OAuthResponse,
    RegisterDTO,
    UpdateProfileDTO,
    UserProfile,
    UserRole,
} from "./auth.types";

export class AuthService {
    constructor(
        private repository = new AuthRepository(),
        private cache = new AuthCache()
    ) { }

    async register(input: RegisterDTO): Promise<AuthResponse> {
        const dto = RegisterSchema.parse(input);
        const existingUser = await this.repository.findByEmail(dto.email);

        if (existingUser) {
            throw new AuthException(409, "EMAIL_EXISTS");
        }

        const supabase = await createClient();
        const { data, error } = await supabase.auth.signUp({
            email: dto.email.toLowerCase(),
            password: dto.password,
            options: {
                data: {
                    display_name: dto.display_name,
                },
            },
        });

        if (error || !data.user) {
            throw this.toAuthException(error?.message, 400);
        }

        const profile = await this.repository.createProfile({
            id: data.user.id,
            email: data.user.email ?? dto.email,
            display_name: dto.display_name,
        });

        this.cache.setUser(profile);

        return {
            user: profile,
            session: mapSession(data.session),
            authorization: mapAuthorization(profile),
            redirect_to: getRoleRedirectPath(profile.role),
        };
    }

    async login(input: LoginDTO): Promise<AuthResponse> {
        const dto = LoginSchema.parse(input);
        const supabase = await createClient();

        const { data, error } = await supabase.auth.signInWithPassword({
            email: dto.email.toLowerCase(),
            password: dto.password,
        });

        if (error) {
            throw this.toLoginException(error.message);
        }

        if (!data.user || !data.session) {
            throw new AuthException(401, "LOGIN_FAILED");
        }

        const profile = await this.ensureProfile(data.user);
        this.cache.setUser(profile);

        return {
            user: profile,
            session: mapSession(data.session),
            authorization: mapAuthorization(profile),
            redirect_to: getRoleRedirectPath(profile.role),
        };
    }

    async logout(): Promise<{ success: true }> {
        const supabase = await createClient();
        const { data } = await supabase.auth.getUser();

        if (data.user) {
            this.cache.deleteUser(data.user.id);
        }

        const { error } = await supabase.auth.signOut();

        if (error) {
            throw this.toAuthException(error.message, 400);
        }

        return { success: true };
    }

    async refresh(refreshToken?: string): Promise<AuthResponse> {
        const supabase = await createClient();
        const { data, error } = await supabase.auth.refreshSession(
            refreshToken ? { refresh_token: refreshToken } : undefined
        );

        if (error || !data.user || !data.session) {
            throw new AuthException(401, "INVALID_REFRESH_TOKEN");
        }

        const profile = await this.ensureProfile(data.user);
        this.cache.setUser(profile);

        return {
            user: profile,
            session: mapSession(data.session),
            authorization: mapAuthorization(profile),
            redirect_to: getRoleRedirectPath(profile.role),
        };
    }

    async me(): Promise<UserProfile> {
        if (!(await hasSupabaseAuthCookie())) {
            throw new AuthException(401, "UNAUTHORIZED");
        }

        const supabase = await createClient();
        const { data, error } = await supabase.auth.getUser();

        if (error || !data.user) {
            throw new AuthException(401, "UNAUTHORIZED");
        }

        const cachedUser = this.cache.getUser(data.user.id);

        if (cachedUser) {
            return cachedUser;
        }

        const profile = await this.ensureProfile(data.user);
        this.cache.setUser(profile);

        return profile;
    }

    async updateProfile(input: UpdateProfileDTO, avatar?: File): Promise<UserProfile> {
        const currentUser = await this.me();
        const dto = UpdateProfileSchema.parse(input);

        const oldAvatarUrl = currentUser.avatar_url;

        if (avatar) {
            if (!avatar.type.startsWith("image/")) {
                throw new AuthException(422, "INVALID_AVATAR");
            }

            dto.avatar_url = await this.repository.uploadAvatar(currentUser.id, avatar);
          
        }

        const profile = await this.repository.updateProfile(currentUser.id, dto);
        const supabase = await createClient();

        await supabase.auth.updateUser({
            data: {
                display_name: profile.display_name,
                full_name: profile.full_name,
                avatar_url: profile.avatar_url,
            },
        });

        if (avatar && oldAvatarUrl && oldAvatarUrl !== profile.avatar_url) {
            await this.repository.deleteAvatarByUrl(currentUser.id, oldAvatarUrl);
        }

        this.cache.setUser(profile);

        return profile;
    }

    async googleOAuth(input: GoogleOAuthDTO = {}, defaultRedirectTo: string): Promise<OAuthResponse> {
        const dto = GoogleOAuthSchema.parse(input);
        const supabase = await createClient();
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: dto.redirect_to ?? defaultRedirectTo,
            },
        });

        if (error || !data.url) {
            throw new AuthException(400, "OAUTH_FAILED", error?.message);
        }

        return {
            provider: "google",
            url: data.url,
        };
    }

    async handleOAuthCallback(code: string): Promise<AuthResponse> {
        const supabase = await createClient();
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);

        if (error || !data.user || !data.session) {
            throw new AuthException(401, "OAUTH_FAILED", error?.message);
        }

        const profile = await this.ensureProfile(data.user);
        this.cache.setUser(profile);

        return {
            user: profile,
            session: mapSession(data.session),
            authorization: mapAuthorization(profile),
            redirect_to: getRoleRedirectPath(profile.role),
        };
    }

    async requireRole(allowedRoles: UserRole[]): Promise<UserProfile> {
        const profile = await this.me();

        if (!allowedRoles.includes(profile.role)) {
            throw new AuthException(403, "FORBIDDEN");
        }

        return profile;
    }

    private async ensureProfile(user: User): Promise<UserProfile> {
        const cachedUser = this.cache.getUser(user.id);

        if (cachedUser) {
            return cachedUser;
        }

        const profile = await this.repository.findById(user.id);

        if (profile) {
            return profile;
        }

        if (!user.email) {
            throw new AuthException(404, "USER_NOT_FOUND");
        }

        const metadata = user.user_metadata ?? {};
        const displayName = this.resolveDisplayName(user);

        try {
            return await this.repository.createProfile({
                id: user.id,
                email: user.email,
                display_name: displayName,
                full_name: this.readMetadataString(metadata.full_name) ?? this.readMetadataString(metadata.name),
                avatar_url: this.readMetadataString(metadata.avatar_url) ?? this.readMetadataString(metadata.picture),
            });
        } catch {
            throw new AuthException(409, "PROFILE_SYNC_FAILED");
        }
    }

    private resolveDisplayName(user: User): string {
        const metadata = user.user_metadata ?? {};
        const metadataName =
            this.readMetadataString(metadata.display_name) ??
            this.readMetadataString(metadata.name) ??
            this.readMetadataString(metadata.full_name);

        return metadataName ?? user.email?.split("@")[0] ?? "nightlife_user";
    }

    private readMetadataString(value: unknown): string | undefined {
        return typeof value === "string" && value.trim().length > 0
            ? value.trim()
            : undefined;
    }

    private toAuthException(message = AuthError.UNAUTHORIZED, status = 401): AuthException {
        if (message.toLowerCase().includes("already")) {
            return new AuthException(409, "EMAIL_EXISTS", message);
        }

        return new AuthException(status, "UNAUTHORIZED", message);
    }

    private toLoginException(message: string): AuthException {
        const normalizedMessage = message.toLowerCase();

        if (normalizedMessage.includes("email not confirmed")) {
            return new AuthException(403, "EMAIL_NOT_CONFIRMED", message);
        }

        if (
            normalizedMessage.includes("invalid login credentials") ||
            normalizedMessage.includes("invalid credentials")
        ) {
            return new AuthException(401, "INVALID_PASSWORD", message);
        }

        return new AuthException(401, "LOGIN_FAILED", message);
    }
}
