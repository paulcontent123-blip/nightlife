"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clientFetch } from "@/lib/api/client";
import { notifyAuthStateChanged } from "@/lib/auth/auth-events";

export function UserMenu({ displayName }: { displayName: string }) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);

        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    async function handleLogout() {
        setLoggingOut(true);

        try {
            await clientFetch("/api/v1/auth/logout", { method: "POST" });
            notifyAuthStateChanged();
        } finally {
            router.push("/");
            router.refresh();
        }
    }

    return (
        <div ref={containerRef} className="relative">
            <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-white/5"
            >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-wash text-[11px] font-bold text-amber">
                    {displayName.charAt(0).toUpperCase()}
                </span>
                <span className="hidden sm:inline">{displayName}</span>
                <span className="text-[10px] text-muted">{open ? "▴" : "▾"}</span>
            </button>

            {open && (
                <div className="absolute right-0 top-[calc(100%+8px)] w-56 overflow-hidden rounded-xl border border-border-strong bg-void-2 py-1.5 shadow-[0_12px_40px_rgba(0,0,0,.55)]">
                    <MenuLink href="/passport" onNavigate={() => setOpen(false)}>
                        🧭 Passport
                    </MenuLink>
                    <MenuLink href="/notifications" onNavigate={() => setOpen(false)}>
                        🔔 Thông báo
                    </MenuLink>
                    <MenuLink href="/bookings/mine" onNavigate={() => setOpen(false)}>
                        🪑 Đặt bàn của tôi
                    </MenuLink>
                    <MenuLink href="/tickets/mine" onNavigate={() => setOpen(false)}>
                        🎫 Vé của tôi
                    </MenuLink>
                    <div className="my-1.5 h-px bg-border" />
                    <button
                        type="button"
                        onClick={handleLogout}
                        disabled={loggingOut}
                        className="block w-full px-3.5 py-2 text-left text-[13px] font-medium text-pink transition-colors hover:bg-white/5 disabled:opacity-50"
                    >
                        {loggingOut ? "Đang đăng xuất..." : "🚪 Đăng xuất"}
                    </button>
                </div>
            )}
        </div>
    );
}

function MenuLink({ href, children, onNavigate }: { href: string; children: ReactNode; onNavigate: () => void }) {
    return (
        <Link
            href={href}
            prefetch={false}
            onClick={onNavigate}
            className="block px-3.5 py-2 text-[13px] font-medium text-muted transition-colors hover:bg-white/5 hover:text-white"
        >
            {children}
        </Link>
    );
}
