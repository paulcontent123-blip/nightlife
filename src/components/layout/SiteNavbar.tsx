import Link from "next/link";
import { NavLinks } from "./NavLinks";
import { SiteNavbarAuth } from "./SiteNavbarAuth";

const NAV_LINKS = [
    { href: "/", label: "Kham pha" },
    { href: "/venues", label: "Dia diem" },
    { href: "/events", label: "Su kien" },
    { href: "/happy-hour", label: "Happy Hour" },
    { href: "/bai-viet", label: "Bai viet" },
    { href: "/forum", label: "Cong dong" },
    { href: "/bar-tour", label: "Bar Tour" },
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

            <SiteNavbarAuth />
        </nav>
    );
}
