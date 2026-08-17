import Link from "next/link";
import { serverFetch } from "@/lib/api/server";
import { ApiError } from "@/lib/api/envelope";
import type { UserProfile } from "@/lib/api/types";
import { NavLinks } from "./NavLinks";
import { UserMenu } from "./UserMenu";

const NAV_LINKS = [
    { href: "/", label: "Khám phá" },
    { href: "/venues", label: "Địa điểm" },
    { href: "/events", label: "Sự kiện" },
    { href: "/happy-hour", label: "Happy Hour" },
    { href: "/bai-viet", label: "Bài viết" },
    { href: "/forum", label: "Cộng đồng" },
    { href: "/bar-tour", label: "Bar Tour ĐNA" },
];

async function getCurrentUser(): Promise<UserProfile | null> {
    try {
        return await serverFetch<UserProfile>("/api/v1/auth/me");
    } catch (error) {
        if (error instanceof ApiError) {
            return null;
        }

        throw error;
    }
}

export async function SiteNavbar() {
    const user = await getCurrentUser();

    return (
        <nav className="fixed left-0 right-0 top-0 z-50 flex h-16 items-center justify-between border-b border-border-strong bg-void/90 px-5 backdrop-blur-xl sm:px-10">
            <Link href="/" className="flex items-center gap-2.5">
                <span className="h-[7px] w-[7px] animate-pulse rounded-full bg-pink" />
                <span className="font-display text-[19px] font-extrabold tracking-tight">
                    <span className="text-amber">Night</span>life.vn
                </span>
            </Link>

            <div className="hidden items-center gap-1 md:flex">
                <NavLinks links={NAV_LINKS} />
                {user?.role === "admin" && (
                    <Link
                        href="/admin/dashboard"
                        className="rounded-lg px-3.5 py-1.5 text-[13px] font-medium text-amber transition-colors hover:bg-amber-wash"
                    >
                        Admin
                    </Link>
                )}
            </div>

            <div className="flex items-center gap-2">
                {user ? (
                    <UserMenu displayName={user.display_name} />
                ) : (
                    <>
                        <Link
                            href="/login"
                            className="rounded-lg border-[1.5px] border-transparent px-3.5 py-1.5 font-display text-[13px] font-bold text-muted transition-colors hover:border-border-heavy hover:text-white"
                        >
                            Đăng nhập
                        </Link>
                        <Link
                            href="/membership"
                            className="rounded-lg border-[1.5px] border-amber-border px-4 py-1.5 font-display text-[13px] font-bold text-amber transition-colors hover:bg-amber-wash"
                        >
                            👑 VIP Member
                        </Link>
                        <Link
                            href="/lien-he"
                            className="rounded-lg bg-amber px-4 py-1.5 font-display text-[13px] font-bold text-void shadow-[0_2px_16px_rgba(240,160,48,.35)] transition-all hover:-translate-y-0.5 hover:bg-amber-2 hover:shadow-[0_4px_24px_rgba(240,160,48,.5)]"
                        >
                            Đặt bàn ngay
                        </Link>
                    </>
                )}
            </div>
        </nav>
    );
}
