"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export interface NavSubLink {
    href: string;
    label: string;
}

export interface NavLinkItem {
    href?: string;
    label: string;
    children?: NavSubLink[];
}

function isPathActive(pathname: string, href: string) {
    return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function NavLinks({ links }: { links: NavLinkItem[] }) {
    const pathname = usePathname();

    return (
        <>
            {links.map((link) =>
                link.children ? (
                    <NavDropdown key={link.label} label={link.label} items={link.children} pathname={pathname} />
                ) : (
                    <NavLink key={link.href} href={link.href ?? "#"} label={link.label} pathname={pathname} />
                )
            )}
        </>
    );
}

function NavLink({ href, label, pathname }: { href: string; label: string; pathname: string }) {
    const isActive = isPathActive(pathname, href);

    return (
        <Link
            href={href}
            prefetch={false}
            className={[
                "rounded-lg px-3.5 py-1.5 text-[13px] font-medium transition-colors",
                isActive ? "bg-amber-wash text-amber" : "text-muted hover:bg-white/5 hover:text-white",
            ].join(" ")}
        >
            {label}
        </Link>
    );
}

function NavDropdown({ label, items, pathname }: { label: string; items: NavSubLink[]; pathname: string }) {
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const isActive = items.some((item) => isPathActive(pathname, item.href));

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);

        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div ref={containerRef} className="relative">
            <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                className={[
                    "flex items-center gap-1 rounded-lg px-3.5 py-1.5 text-[13px] font-medium transition-colors",
                    isActive ? "bg-amber-wash text-amber" : "text-muted hover:bg-white/5 hover:text-white",
                ].join(" ")}
            >
                {label}
                <span className="text-[10px]">{open ? "▴" : "▾"}</span>
            </button>

            {open && (
                <div className="absolute left-0 top-[calc(100%+8px)] w-52 overflow-hidden rounded-xl border border-border-strong bg-void-2 py-1.5 shadow-[0_12px_40px_rgba(0,0,0,.55)]">
                    {items.map((item) => {
                        const itemActive = isPathActive(pathname, item.href);

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                prefetch={false}
                                onClick={() => setOpen(false)}
                                className={[
                                    "block px-3.5 py-2 text-[13px] font-medium transition-colors",
                                    itemActive ? "text-amber" : "text-muted hover:bg-white/5 hover:text-white",
                                ].join(" ")}
                            >
                                {item.label}
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
