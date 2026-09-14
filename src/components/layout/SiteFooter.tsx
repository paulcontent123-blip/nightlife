import Link from "next/link";
import { getTranslations } from "next-intl/server";

const SOCIAL_ICONS = ["f", "◎", "▶", "𝕏", "◌"];

interface FooterLink {
    label: string;
    href: string;
}

function FooterLinkItem({ href, label }: FooterLink) {
    const className = "break-words text-[12.5px] text-muted transition-colors hover:text-white";

    if (href === "#") {
        return <a href="#" className={className}>{label}</a>;
    }

    return <Link href={href} prefetch={false} className={className}>{label}</Link>;
}

export async function SiteFooter() {
    const t = await getTranslations("Footer");
    const columns: Array<{ title: string; links: FooterLink[] }> = [
        {
            title: t("explore"),
            links: [
                { label: t("findVenues"), href: "/venues" },
                { label: t("events"), href: "/events" },
                { label: "Happy Hour", href: "/happy-hour" },
                { label: "Bar Tour", href: "/bar-tour" },
                { label: t("news"), href: "/bai-viet" },
                { label: t("newOpenings"), href: "/venues?sort=newest" },
            ],
        },
        {
            title: t("features"),
            links: [
                { label: t("membership"), href: "/membership" },
                { label: t("passport"), href: "/passport" },
                { label: t("community"), href: "/forum" },
                { label: t("corporate"), href: "/lien-he" },
            ],
        },
        {
            title: t("cities"),
            links: [
                { label: "TP. Hồ Chí Minh", href: "/venues?city=hcm" },
                { label: "Hà Nội", href: "/venues?city=hanoi" },
                { label: "Đà Nẵng", href: "/venues?city=danang" },
            ],
        },
        {
            title: t("partners"),
            links: [
                { label: t("addVenue"), href: "/lien-he" },
                { label: t("advertising"), href: "/lien-he" },
                { label: "BookingModel (DJ/Talent)", href: "#" },
                { label: "VEA Retail", href: "#" },
            ],
        },
        {
            title: t("support"),
            links: [
                { label: t("hotline"), href: "#" },
                { label: t("faq"), href: "#" },
                { label: t("bookingPolicy"), href: "#" },
                { label: t("privacy"), href: "#" },
                { label: t("terms"), href: "#" },
            ],
        },
    ];

    return (
        <footer className="border-t border-border bg-void px-5 py-12 sm:px-10 sm:py-16">
            <div className="mx-auto w-full max-w-[1600px] min-w-0">
                <div className="mb-10 h-[2px] w-full bg-gradient-to-r from-amber via-pink to-cyan" />

                <div className="mb-10 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
                    <div className="min-w-0">
                        <p className="mb-2.5 font-display text-[22px] font-extrabold">
                            <span className="text-amber">Night</span>life.vn
                        </p>
                        <p className="mb-4 text-[13px] leading-relaxed text-muted">{t("description")}</p>
                        <div className="flex flex-wrap gap-2">
                            {SOCIAL_ICONS.map((icon, index) => (
                                <a
                                    key={index}
                                    href="#"
                                    aria-label={`Social link ${index + 1}`}
                                    className="flex h-[34px] w-[34px] items-center justify-center rounded-lg border border-border-strong text-sm text-muted transition-colors hover:border-amber-border hover:bg-amber-wash hover:text-amber"
                                >
                                    {icon}
                                </a>
                            ))}
                        </div>
                    </div>

                    <div className="grid min-w-0 grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
                        {columns.map((column) => (
                            <div key={column.title} className="min-w-0">
                                <p className="mb-3.5 break-words font-display text-[11px] font-bold uppercase text-muted-2">
                                    {column.title}
                                </p>
                                <ul className="flex flex-col gap-2">
                                    {column.links.map((link) => (
                                        <li key={`${link.href}-${link.label}`} className="min-w-0">
                                            <FooterLinkItem {...link} />
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="mb-5 h-px bg-border" />

                <div className="flex flex-col gap-4 text-xs text-muted-2 sm:flex-row sm:items-center sm:justify-between">
                    <p>© 2026 Nightlife.vn · <span className="text-amber">VEA Group</span></p>
                    <div className="flex flex-wrap gap-x-4 gap-y-2">
                        <a href="#" className="transition-colors hover:text-white">{t("privacy")}</a>
                        <a href="#" className="transition-colors hover:text-white">{t("terms")}</a>
                        <a href="#" className="transition-colors hover:text-white">{t("cookie")}</a>
                        <a href="#" className="transition-colors hover:text-white">{t("sitemap")}</a>
                    </div>
                </div>
            </div>
        </footer>
    );
}
