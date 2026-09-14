import type { ReactNode } from "react";
import type { MembershipPerks, MembershipTier } from "@/lib/api/types";
import { formatVnd } from "@/lib/format";
import { getTranslations } from "next-intl/server";

export async function MembershipTierCard({
    tier,
    isCurrent,
    isFeatured,
    children,
}: {
    tier: MembershipTier;
    isCurrent: boolean;
    isFeatured?: boolean;
    children?: ReactNode;
}) {
    const t = await getTranslations("Membership");
    const perks: MembershipPerks = tier.perks;
    const descriptions: Record<MembershipTier["tier"], string> = {
        free: t("freeDescription"),
        night_pass: t("nightPassDescription"),
        black_card: t("blackCardDescription"),
    };
    const perkItems: Array<{ label: string; included: boolean }> = [
        { label: t("allVenues"), included: true },
        { label: t("viewDeals"), included: true },
        {
            label: perks.priority_booking_hours > 0
                ? t("priorityHours", { hours: perks.priority_booking_hours })
                : t("priorityEarly"),
            included: perks.priority_booking_hours > 0,
        },
        { label: t("exclusiveDeals"), included: perks.can_view_exclusive_deals },
        {
            label: perks.unlimited_cover_charge
                ? t("unlimitedCover")
                : perks.monthly_cover_vouchers
                    ? t("coverVouchers", { count: perks.monthly_cover_vouchers })
                    : t("coverCharge"),
            included: perks.unlimited_cover_charge || Boolean(perks.monthly_cover_vouchers),
        },
        {
            label: perks.squad_discount_percent > 0
                ? t("groupDiscount", { percent: perks.squad_discount_percent })
                : t("groupOffer"),
            included: perks.squad_discount_percent > 0,
        },
        { label: t("guaranteedVip"), included: perks.guaranteed_vip_table },
        { label: t("concierge"), included: Boolean(perks.concierge_hotline) },
        {
            label: perks.bar_tour_discount_percent > 0
                ? t("barTourDiscount", { percent: perks.bar_tour_discount_percent })
                : t("barTourOffer"),
            included: perks.bar_tour_discount_percent > 0,
        },
    ];

    return (
        <div
            className={[
                "relative flex flex-col overflow-hidden rounded-xl border-2 p-6",
                isFeatured ? "border-amber-border shadow-[0_0_0_4px_var(--color-amber-wash)]" : "border-border",
            ].join(" ")}
        >
            {isFeatured && (
                <span className="absolute right-0 top-0 rounded-bl-lg bg-amber px-3.5 py-1 font-display text-[10px] font-extrabold tracking-wide text-void">
                    {t("popular")}
                </span>
            )}
            <p className="mb-2.5 font-display text-[11px] font-bold uppercase tracking-wide text-muted">{tier.name}</p>
            <p className="mb-1 font-display text-3xl font-extrabold">
                {tier.price_vnd > 0 ? formatVnd(tier.price_vnd) : t("free")}
                {tier.billing_period === "monthly" && <span className="text-base font-normal text-muted"> {t("perMonth")}</span>}
            </p>
            <p className="mb-4 text-[13px] text-muted">{descriptions[tier.tier]}</p>
            <div className="mb-5 flex flex-1 flex-col gap-2">
                {perkItems.map((perk) => (
                    <div key={perk.label} className={["flex items-start gap-2 text-[13px]", perk.included ? "text-white" : "text-muted-2"].join(" ")}>
                        <span className={perk.included ? "text-amber" : "text-muted-2"}>{perk.included ? "✓" : "—"}</span>
                        {perk.label}
                    </div>
                ))}
            </div>
            {isCurrent ? (
                <div className="rounded-lg border-[1.5px] border-border-strong py-2.5 text-center font-display text-[13.5px] font-bold text-muted">
                    {t("current")}
                </div>
            ) : (
                children
            )}
        </div>
    );
}
