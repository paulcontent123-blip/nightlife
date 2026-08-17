import { createAdminClient } from "@/lib/supabase/admin";
import { AuthException } from "./auth.errors";
import { mapUserProfile } from "./auth.mapper";
import type { UpdateProfileDTO, UserProfile, UserRow } from "./auth.types";

interface CreateProfileInput {
    id: string;
    email: string;
    display_name: string;
    full_name?: string | null;
    avatar_url?: string | null;
}

const USERS_TABLE = "users";
const AVATARS_BUCKET = "avatars";

export class AuthRepository {
    private get supabase() {
        return createAdminClient();
    }

    async findById(id: string): Promise<UserProfile | null> {
        const { data, error } = await this.supabase
            .from(USERS_TABLE)
            .select("*")
            .eq("id", id)
            .maybeSingle<UserRow>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return data ? mapUserProfile(data) : null;
    }

    async findByEmail(email: string): Promise<UserProfile | null> {
        const { data, error } = await this.supabase
            .from(USERS_TABLE)
            .select("*")
            .eq("email", email.toLowerCase())
            .maybeSingle<UserRow>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return data ? mapUserProfile(data) : null;
    }

    async createProfile(input: CreateProfileInput): Promise<UserProfile> {
        const { data, error } = await this.supabase
            .from(USERS_TABLE)
            .insert({
                id: input.id,
                email: input.email.toLowerCase(),
                display_name: input.display_name,
                full_name: input.full_name ?? null,
                avatar_url: input.avatar_url ?? null,
                role: "user",
                membership_tier: "free",
                nightlife_passport_points: 0,
            })
            .select("*")
            .single<UserRow>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return mapUserProfile(data);
    }

    async updateProfile(id: string, input: UpdateProfileDTO): Promise<UserProfile> {
        const { data, error } = await this.supabase
            .from(USERS_TABLE)
            .update(input)
            .eq("id", id)
            .select("*")
            .single<UserRow>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return mapUserProfile(data);
    }

    async uploadAvatar(userId: string, avatar: File): Promise<string> {
        const extension = avatar.name.split(".").pop()?.toLowerCase() || "jpg";
        const safeName = `${Date.now()}.${extension}`;
        const path = `${userId}/${safeName}`;
        const buffer = await avatar.arrayBuffer();

        const { error } = await this.supabase.storage
            .from(AVATARS_BUCKET)
            .upload(path, buffer, {
                contentType: avatar.type,
                upsert: true,
            });

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        const { data } = this.supabase.storage
            .from(AVATARS_BUCKET)
            .getPublicUrl(path);

        return data.publicUrl;
    }

    async deleteAvatarByUrl(userId: string, avatarUrl: string | null): Promise<void> {
        const path = this.getAvatarStoragePath(userId, avatarUrl);

        if (!path) {
            return;
        }

        const { error } = await this.supabase.storage
            .from(AVATARS_BUCKET)
            .remove([path]);

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }
    }

    private getAvatarStoragePath(userId: string, avatarUrl: string | null): string | null {
        if (!avatarUrl) {
            return null;
        }

        try {
            const url = new URL(avatarUrl);
            const publicObjectPrefix = `/storage/v1/object/public/${AVATARS_BUCKET}/`;
            const prefixIndex = url.pathname.indexOf(publicObjectPrefix);

            if (prefixIndex === -1) {
                return null;
            }

            const path = decodeURIComponent(
                url.pathname.slice(prefixIndex + publicObjectPrefix.length)
            );

            return path.startsWith(`${userId}/`) ? path : null;
        } catch {
            return null;
        }
    }
}
