import Link from "next/link";

const SOCIAL_ICONS = ["f", "📷", "▶", "𝕏", "💬"];

interface FooterLink {
    label: string;
    href: string;
}

const FOOTER_COLUMNS: Array<{ title: string; links: FooterLink[] }> = [
    {
        title: "Khám phá",
        links: [
            { label: "Tìm địa điểm", href: "/venues" },
            { label: "Events & Concerts", href: "/events" },
            { label: "Happy Hour", href: "/happy-hour" },
            { label: "Bar Tour ĐNA", href: "/bar-tour" },
            { label: "Điểm tin nightlife", href: "/bai-viet" },
            { label: "New Openings", href: "/venues?sort=newest" },
        ],
    },
    {
        title: "Tính năng",
        links: [
            { label: "VIP Membership", href: "/membership" },
            { label: "Nightlife Passport", href: "/passport" },
            { label: "Giao lưu Clubber", href: "/forum" },
            { label: "Corporate Events", href: "/lien-he" },
        ],
    },
    {
        title: "Thành phố",
        links: [
            { label: "TP. Hồ Chí Minh", href: "/venues?city=hcm" },
            { label: "Hà Nội", href: "/venues?city=hanoi" },
            { label: "Đà Nẵng", href: "/venues?city=danang" },
        ],
    },
    {
        title: "Đối tác",
        links: [
            { label: "Đưa venue lên Nightlife", href: "/lien-he" },
            { label: "Quảng cáo & Hợp tác", href: "/lien-he" },
            { label: "BookingModel (DJ/Talent)", href: "#" },
            { label: "VEA Retail (vé)", href: "#" },
        ],
    },
    {
        title: "Hỗ trợ",
        links: [
            { label: "Hotline 24/7", href: "#" },
            { label: "FAQ", href: "#" },
            { label: "Chính sách đặt bàn", href: "#" },
            { label: "Bảo mật", href: "#" },
            { label: "Điều khoản", href: "#" },
        ],
    },
];

function FooterLinkItem({ href, label }: FooterLink) {
    const className = "text-[12.5px] text-muted transition-colors hover:text-white";

    if (href === "#") {
        return (
            <a href="#" className={className}>
                {label}
            </a>
        );
    }

    return (
        <Link href={href} prefetch={false} className={className}>
            {label}
        </Link>
    );
}

export function SiteFooter() {
    return (
        <footer className="border-t border-border bg-void px-5 py-14 sm:px-10 sm:py-16">
            <div>
                <div className="mb-11 h-[2px] w-full bg-gradient-to-r from-amber via-pink to-cyan" />

                <div className="mb-11 grid grid-cols-1 gap-10 lg:grid-cols-[280px_1fr]">
                    <div>
                        <p className="mb-2.5 font-display text-[22px] font-extrabold">
                            <span className="text-amber">Night</span>life.vn
                        </p>
                        <p className="mb-4 text-[13px] leading-relaxed text-muted">
                            Vietnam&apos;s #1 Nightlife Platform — Khám phá 2.800+ bars, clubs và venues đã xác minh tại Việt Nam
                            và Đông Nam Á. Thành viên VEA Group.
                        </p>
                        <div className="flex gap-2">
                            {SOCIAL_ICONS.map((icon, index) => (
                                <a
                                    key={index}
                                    href="#"
                                    className="flex h-[34px] w-[34px] items-center justify-center rounded-lg border border-border-strong text-sm text-muted transition-colors hover:border-amber-border hover:bg-amber-wash hover:text-amber"
                                >
                                    {icon}
                                </a>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
                        {FOOTER_COLUMNS.map((column) => (
                            <div key={column.title}>
                                <p className="mb-3.5 font-display text-[11px] font-bold uppercase tracking-wide text-muted-2">
                                    {column.title}
                                </p>
                                <ul className="flex flex-col gap-2">
                                    {column.links.map((link) => (
                                        <li key={link.label}>
                                            <FooterLinkItem {...link} />
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="mb-5 h-px bg-border" />

                <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-2">
                    <p>
                        © 2026 Nightlife.com.vn · Thành viên <span className="text-amber">VEA Group</span> · Vietnam Era Group
                        🇻🇳
                    </p>
                    <div className="flex gap-4">
                        <a href="#" className="transition-colors hover:text-white">
                            Bảo mật
                        </a>
                        <a href="#" className="transition-colors hover:text-white">
                            Điều khoản
                        </a>
                        <a href="#" className="transition-colors hover:text-white">
                            Cookie
                        </a>
                        <a href="#" className="transition-colors hover:text-white">
                            Sitemap
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
}
