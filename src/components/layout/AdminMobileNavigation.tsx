"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_LINKS } from "./AdminSidebar";

export function AdminMobileNavigation() {
    const pathname = usePathname();
    const [open, setOpen] = useState(false);

    useEffect(() => {
        setOpen(false);
    }, [pathname]);

    useEffect(() => {
        if (!open) return;

        function closeOnEscape(event: KeyboardEvent) {
            if (event.key === "Escape") setOpen(false);
        }

        document.addEventListener("keydown", closeOnEscape);
        return () => document.removeEventListener("keydown", closeOnEscape);
    }, [open]);

    return (
        <div className="md:hidden">
            <button
                type="button"
                aria-label={open ? "Đóng menu quản trị" : "Mở menu quản trị"}
                aria-expanded={open}
                aria-controls="admin-mobile-menu"
                title={open ? "Đóng menu" : "Menu quản trị"}
                onClick={() => setOpen((value) => !value)}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border-strong text-lg text-muted hover:border-amber-border hover:text-amber"
            >
                <span aria-hidden="true">{open ? "×" : "☰"}</span>
            </button>

            {open && (
                <div id="admin-mobile-menu" className="absolute inset-x-0 top-16 z-50 max-h-[calc(100dvh-4rem)] overflow-y-auto border-b border-border-strong bg-void-2 p-3 shadow-2xl">
                    <nav className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                        {ADMIN_LINKS.map((link) => {
                            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);

                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    prefetch={false}
                                    className={[
                                        "flex min-h-11 min-w-0 items-center gap-2.5 rounded-lg px-3 text-sm font-medium",
                                        active ? "bg-amber-wash text-amber" : "text-muted hover:bg-white/5 hover:text-white",
                                    ].join(" ")}
                                >
                                    <span aria-hidden="true">{link.icon}</span>
                                    <span className="break-words">{link.label}</span>
                                </Link>
                            );
                        })}
                        <Link href="/" prefetch={false} className="flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-muted hover:bg-white/5 hover:text-white">
                            ← Về trang chính
                        </Link>
                    </nav>
                </div>
            )}
        </div>
    );
}
