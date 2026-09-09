"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { clientFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/envelope";
import { AUTH_STATE_CHANGED_EVENT } from "@/lib/auth/auth-events";
import type { UserProfile } from "@/lib/api/types";
import { UserMenu } from "./UserMenu";

export function SiteNavbarAuth() {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        let active = true;

        async function loadUser() {
            if (!hasSupabaseAuthCookie()) {
                if (active) {
                    setUser(null);
                    setLoaded(true);
                }

                return;
            }

            setLoaded(false);

            try {
                const profile = await clientFetch<UserProfile>("/api/v1/auth/me");

                if (active) setUser(profile);
            } catch (error) {
                if (!(error instanceof ApiError)) {
                    console.error(error);
                }

                if (active) setUser(null);
            } finally {
                if (active) setLoaded(true);
            }
        }

        function handleAuthStateChanged() {
            void loadUser();
        }

        void loadUser();
        window.addEventListener(AUTH_STATE_CHANGED_EVENT, handleAuthStateChanged);

        return () => {
            active = false;
            window.removeEventListener(AUTH_STATE_CHANGED_EVENT, handleAuthStateChanged);
        };
    }, []);

    if (!loaded) {
        return <div className="h-8 w-24 rounded-lg bg-white/5" aria-hidden="true" />;
    }

    if (user) {
        return (
            <div className="flex items-center gap-2">
                {user.role === "admin" && (
                    <Link
                        href="/admin/dashboard"
                        prefetch={false}
                        className="hidden rounded-lg px-3.5 py-1.5 text-[13px] font-medium text-amber transition-colors hover:bg-amber-wash md:inline-flex"
                    >
                        Quản trị
                    </Link>
                )}
                <UserMenu displayName={user.display_name} />
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2">
            <Link
                href="/login"
                prefetch={false}
                className="rounded-lg border-[1.5px] border-transparent px-3.5 py-1.5 font-display text-[13px] font-bold text-muted transition-colors hover:border-border-heavy hover:text-white"
            >
                Đăng nhập
            </Link>
            <Link
                href="/membership"
                prefetch={false}
                className="rounded-lg border-[1.5px] border-amber-border px-4 py-1.5 font-display text-[13px] font-bold text-amber transition-colors hover:bg-amber-wash"
            >
                VIP Member
            </Link>
            <Link
                href="/lien-he"
                prefetch={false}
                className="rounded-lg bg-amber px-4 py-1.5 font-display text-[13px] font-bold text-void shadow-[0_2px_16px_rgba(240,160,48,.35)] transition-all hover:-translate-y-0.5 hover:bg-amber-2 hover:shadow-[0_4px_24px_rgba(240,160,48,.5)]"
            >
                Đặt bàn ngay
            </Link>
        </div>
    );
}

function hasSupabaseAuthCookie() {
    return document.cookie.split(";").some((cookie) => {
        const name = cookie.trim().split("=", 1)[0] ?? "";

        return name.startsWith("sb-") && name.includes("-auth-token");
    });
}
