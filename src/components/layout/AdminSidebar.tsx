import Link from "next/link";

const LINKS = [
    { href: "/admin/dashboard", label: "Dashboard", icon: "📊" },
    { href: "/admin/venues", label: "Venues", icon: "🏙️" },
    { href: "/admin/bookings", label: "Đặt bàn", icon: "🪑" },
    { href: "/admin/ticket-orders", label: "Vé sự kiện", icon: "🎫" },
    { href: "/admin/tickets/checkin", label: "Check-in vé", icon: "✅" },
    { href: "/admin/membership", label: "Membership", icon: "👑" },
    { href: "/admin/passport", label: "Passport", icon: "🧭" },
    { href: "/admin/bai-viet", label: "Bài viết SEO", icon: "📰" },
    { href: "/admin/forum/posts", label: "Forum", icon: "💬" },
    { href: "/admin/forum/reports", label: "Báo cáo", icon: "🚩" },
    { href: "/admin/notifications", label: "Thông báo", icon: "🔔" },
];

export function AdminSidebar() {
    return (
        <aside className="hidden w-56 shrink-0 border-r border-border bg-void-2 px-3 py-6 md:block">
            <Link href="/admin/dashboard" className="mb-8 flex items-center gap-2 px-2">
                <span className="h-[7px] w-[7px] rounded-full bg-pink" />
                <span className="font-display text-[16px] font-extrabold">
                    <span className="text-amber">Night</span>life
                    <span className="ml-1 text-[10px] font-bold uppercase tracking-wide text-muted">Admin</span>
                </span>
            </Link>
            <nav className="flex flex-col gap-1">
                {LINKS.map((link) => (
                    <Link
                        key={link.href}
                        href={link.href}
                        className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-white/5 hover:text-white"
                    >
                        <span>{link.icon}</span>
                        {link.label}
                    </Link>
                ))}
            </nav>
            <Link
                href="/"
                className="mt-8 flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-muted-2 transition-colors hover:text-white"
            >
                ← Về trang chính
            </Link>
        </aside>
    );
}
