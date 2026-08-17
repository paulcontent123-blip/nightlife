import { USER_CACHE_TTL } from "./auth.constants";
import type { UserProfile } from "./auth.types";

interface CacheEntry {
    value: UserProfile;
    expiresAt: number;
}

export class AuthCache {
    private cache = new Map<string, CacheEntry>();

    getUser(userId: string): UserProfile | null {
        const entry = this.cache.get(userId);

        if (!entry || entry.expiresAt <= Date.now()) {
            this.cache.delete(userId);
            return null;
        }

        return entry.value;
    }

    setUser(user: UserProfile, ttl = USER_CACHE_TTL) {
        this.cache.set(user.id, {
            value: user,
            expiresAt: Date.now() + ttl * 1000,
        });
    }

    deleteUser(userId: string) {
        this.cache.delete(userId);
    }
}
