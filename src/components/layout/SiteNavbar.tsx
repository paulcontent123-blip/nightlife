import Link from "next/link";
import { NavLinks } from "./NavLinks";
import { SiteNavbarAuth } from "./SiteNavbarAuth";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

const NAV_LINKS = [
    { href: "/", label: "Trang chủ" },
    { href: "/venues", label: "Địa điểm" },
    {
        label: "Sự kiện",
        children: [
            { href: "/events", label: "Sự kiện hiện tại" },
            { href: "/happy-hour", label: "Happy Hour" },
            { href: "/bar-tour", label: "Bar Tour" },
        ],
    },
    { href: "/forum", label: "Cộng đồng" },
    { href: "/bai-viet", label: "Bài viết" },
];

export function SiteNavbar() {
    return (
        <nav className="fixed left-0 right-0 top-0 z-50 flex h-16 items-center justify-between border-b border-border-strong bg-void/90 px-5 backdrop-blur-xl sm:px-10">
            <Link href="/" prefetch={false} className="flex items-center gap-2.5">
                <span className="h-[7px] w-[7px] animate-pulse rounded-full bg-pink" />
                <span className="font-display text-[19px] font-extrabold tracking-tight">
                    <span className="text-amber">Night</span>life.vn
                </span>
            </Link>

            <div className="hidden items-center gap-1 md:flex">
                <NavLinks links={NAV_LINKS} />
            </div>

            <div className="flex items-center gap-2.5">
                <ThemeToggle />
                <SiteNavbarAuth />
            </div>
        </nav>
    );
}
