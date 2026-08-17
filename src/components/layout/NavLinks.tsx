"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavLink {
    href: string;
    label: string;
}

export function NavLinks({ links }: { links: NavLink[] }) {
    const pathname = usePathname();

    return (
        <>
            {links.map((link) => {
                const isActive = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);

                return (
                    <Link
                        key={link.href}
                        href={link.href}
                        className={[
                            "rounded-lg px-3.5 py-1.5 text-[13px] font-medium transition-colors",
                            isActive ? "bg-amber-wash text-amber" : "text-muted hover:bg-white/5 hover:text-white",
                        ].join(" ")}
                    >
                        {link.label}
                    </Link>
                );
            })}
        </>
    );
}
