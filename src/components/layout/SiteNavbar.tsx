"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { clientFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/envelope";
import { AUTH_STATE_CHANGED_EVENT, notifyAuthStateChanged } from "@/lib/auth/auth-events";
import type { UserProfile } from "@/lib/api/types";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { NavLinks, type NavLinkItem } from "./NavLinks";
import { UserMenu } from "./UserMenu";

export function SiteNavbar() {
    const t = useTranslations("Navigation");
    const pathname = usePathname();
    const router = useRouter();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [user, setUser] = useState<UserProfile | null>(null);
    const [authLoaded, setAuthLoaded] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);

    const navLinks: NavLinkItem[] = [
        { href: "/", label: t("home") },
        { href: "/venues", label: t("venues") },
        {
            label: t("events"),
            children: [
                { href: "/events", label: t("currentEvents") },
                { href: "/happy-hour", label: t("happyHour") },
                { href: "/bar-tour", label: t("barTour") },
            ],
        },
        {
            label: t("nightlifePulse"),
            children: [
                { href: "/bai-viet", label: t("news") },
                { href: "/forum", label: t("community") },
            ],
        },
    ];

    useEffect(() => {
        let active = true;

        async function loadUser() {
            if (!hasSupabaseAuthCookie()) {
                if (active) {
                    setUser(null);
                    setAuthLoaded(true);
                }
                return;
            }

            setAuthLoaded(false);

            try {
                const profile = await clientFetch<UserProfile>("/api/v1/auth/me");
                if (active) setUser(profile);
            } catch (error) {
                if (!(error instanceof ApiError)) console.error(error);
                if (active) setUser(null);
            } finally {
                if (active) setAuthLoaded(true);
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

    useEffect(() => {
        setMobileOpen(false);
    }, [pathname]);

    useEffect(() => {
        const desktopQuery = window.matchMedia("(min-width: 1280px)");
        const closeAtDesktop = (event: MediaQueryListEvent) => {
            if (event.matches) setMobileOpen(false);
        };

        desktopQuery.addEventListener("change", closeAtDesktop);
        return () => desktopQuery.removeEventListener("change", closeAtDesktop);
    }, []);

    useEffect(() => {
        if (!mobileOpen) return;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        function closeOnEscape(event: KeyboardEvent) {
            if (event.key === "Escape") setMobileOpen(false);
        }

        document.addEventListener("keydown", closeOnEscape);
        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener("keydown", closeOnEscape);
        };
    }, [mobileOpen]);

    async function handleLogout() {
        setLoggingOut(true);
        try {
            await clientFetch("/api/v1/auth/logout", { method: "POST" });
            notifyAuthStateChanged();
        } finally {
            setMobileOpen(false);
            setLoggingOut(false);
            router.push("/");
            router.refresh();
        }
    }

    return (
        <nav className="fixed inset-x-0 top-0 z-50 h-16 border-b border-border-strong bg-void/95 backdrop-blur-xl">
            <div className="mx-auto flex h-full w-full max-w-[1600px] min-w-0 items-center gap-3 px-4 sm:px-6 lg:px-8">
                <Link href="/" prefetch={false} className="flex min-w-0 shrink-0 items-center gap-2.5" onClick={() => setMobileOpen(false)}>
                    <span className="h-[7px] w-[7px] shrink-0 animate-pulse rounded-full bg-pink" />
                    <span className="whitespace-nowrap font-display text-[18px] font-extrabold">
                        <span className="text-amber">Night</span>life.vn
                    </span>
                </Link>

                <div className="hidden min-w-0 flex-1 items-center justify-center gap-1 xl:flex">
                    <NavLinks links={navLinks} />
                </div>

                <div className="ml-auto flex shrink-0 items-center gap-2">
                    <LanguageSwitcher />
                    <ThemeToggle />

                    <div className="hidden items-center gap-2 xl:flex">
                        <DesktopAuth user={user} loaded={authLoaded} />
                    </div>

                    <button
                        type="button"
                        aria-label={mobileOpen ? t("closeMenu") : t("openMenu")}
                        aria-expanded={mobileOpen}
                        aria-controls="site-mobile-menu"
                        title={mobileOpen ? t("closeMenu") : t("openMenu")}
                        onClick={() => setMobileOpen((value) => !value)}
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-border-strong text-lg text-muted transition-colors hover:border-amber-border hover:text-amber xl:hidden"
                    >
                        <span aria-hidden="true">{mobileOpen ? "×" : "☰"}</span>
                    </button>
                </div>
            </div>

            {mobileOpen && (
                <div id="site-mobile-menu" className="fixed inset-x-0 top-16 z-50 max-h-[calc(100dvh-4rem)] overflow-y-auto border-b border-border-strong bg-void-2 shadow-2xl xl:hidden">
                    <div className="mx-auto flex max-w-2xl flex-col gap-5 px-5 py-5 sm:px-8">
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            {navLinks.map((item) => (
                                <MobileNavigationGroup
                                    key={item.href ?? item.label}
                                    item={item}
                                    pathname={pathname}
                                    onNavigate={() => setMobileOpen(false)}
                                />
                            ))}
                        </div>
                        <div className="h-px bg-border" />
                        <MobileAuth
                            user={user}
                            loaded={authLoaded}
                            loggingOut={loggingOut}
                            onLogout={handleLogout}
                            closeMenu={() => setMobileOpen(false)}
                        />
                    </div>
                </div>
            )}
        </nav>
    );
}

function DesktopAuth({ user, loaded }: { user: UserProfile | null; loaded: boolean }) {
    const t = useTranslations("Navigation");

    if (!loaded) return <div className="h-8 w-24 rounded-lg bg-white/5" aria-hidden="true" />;

    if (user) {
        return (
            <>
                {user.role === "admin" && (
                    <Link href="/admin/dashboard" prefetch={false} className="rounded-lg px-3 py-1.5 text-[13px] font-medium text-amber hover:bg-amber-wash">
                        {t("admin")}
                    </Link>
                )}
                <UserMenu displayName={user.display_name} />
            </>
        );
    }

    return (
        <>
            <Link href="/login" prefetch={false} className="rounded-lg px-3 py-1.5 font-display text-[13px] font-bold text-muted hover:text-white">
                {t("login")}
            </Link>
            <Link href="/membership" prefetch={false} className="rounded-lg border-[1.5px] border-amber-border px-3 py-1.5 font-display text-[13px] font-bold text-amber hover:bg-amber-wash">
                {t("vipMember")}
            </Link>
            <Link href="/lien-he" prefetch={false} className="rounded-lg bg-amber px-3.5 py-1.5 font-display text-[13px] font-bold text-void shadow-[0_2px_16px_rgba(240,160,48,.35)] hover:bg-amber-2">
                {t("joinNow")}
            </Link>
        </>
    );
}

function MobileNavigationGroup({ item, pathname, onNavigate }: { item: NavLinkItem; pathname: string; onNavigate: () => void }) {
    if (item.href) {
        return <MobileMenuLink href={item.href} active={isPathActive(pathname, item.href)} onNavigate={onNavigate}>{item.label}</MobileMenuLink>;
    }

    return (
        <div className="min-w-0 rounded-lg border border-border bg-void-3 p-2">
            <p className="px-2 py-1 text-[11px] font-bold uppercase text-muted-2">{item.label}</p>
            {item.children?.map((child) => (
                <MobileMenuLink key={child.href} href={child.href} active={isPathActive(pathname, child.href)} onNavigate={onNavigate} compact>
                    {child.label}
                </MobileMenuLink>
            ))}
        </div>
    );
}

function MobileAuth({
    user,
    loaded,
    loggingOut,
    onLogout,
    closeMenu,
}: {
    user: UserProfile | null;
    loaded: boolean;
    loggingOut: boolean;
    onLogout: () => Promise<void>;
    closeMenu: () => void;
}) {
    const t = useTranslations("Navigation");

    if (!loaded) return <div className="h-10 w-full rounded-lg bg-white/5" aria-hidden="true" />;

    if (user) {
        return (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {user.role === "admin" && <MobileMenuLink href="/admin/dashboard" active={false} onNavigate={closeMenu}>{t("admin")}</MobileMenuLink>}
                <MobileMenuLink href="/passport" active={false} onNavigate={closeMenu}>{t("passport")}</MobileMenuLink>
                <MobileMenuLink href="/notifications" active={false} onNavigate={closeMenu}>{t("notifications")}</MobileMenuLink>
                <MobileMenuLink href="/bookings/mine" active={false} onNavigate={closeMenu}>{t("myBookings")}</MobileMenuLink>
                <MobileMenuLink href="/tickets/mine" active={false} onNavigate={closeMenu}>{t("myTickets")}</MobileMenuLink>
                <button
                    type="button"
                    onClick={() => void onLogout()}
                    disabled={loggingOut}
                    className="min-h-10 rounded-lg border border-pink/30 px-3 text-left text-sm font-semibold text-pink disabled:opacity-50"
                >
                    {loggingOut ? t("loggingOut") : t("logout")}
                </button>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Link href="/login" prefetch={false} onClick={closeMenu} className="flex min-h-10 items-center justify-center rounded-lg border border-border-strong px-3 text-sm font-bold text-white">
                {t("login")}
            </Link>
            <Link href="/membership" prefetch={false} onClick={closeMenu} className="flex min-h-10 items-center justify-center rounded-lg border border-amber-border px-3 text-sm font-bold text-amber">
                {t("vipMember")}
            </Link>
            <Link href="/lien-he" prefetch={false} onClick={closeMenu} className="flex min-h-10 items-center justify-center rounded-lg bg-amber px-3 text-sm font-bold text-void">
                {t("joinNow")}
            </Link>
        </div>
    );
}

function MobileMenuLink({ href, active, compact = false, onNavigate, children }: { href: string; active: boolean; compact?: boolean; onNavigate?: () => void; children: ReactNode }) {
    return (
        <Link
            href={href}
            prefetch={false}
            onClick={onNavigate}
            className={[
                "flex min-w-0 items-center rounded-lg px-3 font-semibold transition-colors",
                compact ? "min-h-9 text-[13px]" : "min-h-11 border border-border text-sm",
                active ? "bg-amber-wash text-amber" : "text-muted hover:bg-white/5 hover:text-white",
            ].join(" ")}
        >
            <span className="break-words">{children}</span>
        </Link>
    );
}

function isPathActive(pathname: string, href: string) {
    return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function hasSupabaseAuthCookie() {
    return document.cookie.split(";").some((cookie) => {
        const name = cookie.trim().split("=", 1)[0] ?? "";
        return name.startsWith("sb-") && name.includes("-auth-token");
    });
}
