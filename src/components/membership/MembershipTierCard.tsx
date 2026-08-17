import type { ReactNode } from "react";
import type { MembershipPerks, MembershipTier } from "@/lib/api/types";
import { formatVnd } from "@/lib/format";

function perkLines(perks: MembershipPerks): Array<{ label: string; included: boolean }> {
    return [
        { label: "Đặt bàn tại tất cả venues", included: true },
        { label: "Xem Happy Hour deals", included: true },
        {
            label: perks.priority_booking_hours > 0 ? `Ưu tiên đặt bàn ${perks.priority_booking_hours}h trước` : "Ưu tiên đặt bàn sớm",
            included: perks.priority_booking_hours > 0,
        },
        { label: "Deals độc quyền dành cho hội viên", included: perks.can_view_exclusive_deals },
        {
            label: perks.unlimited_cover_charge
                ? "Miễn phí cover không giới hạn"
                : perks.monthly_cover_vouchers
                    ? `Miễn phí cover ${perks.monthly_cover_vouchers} venue/tháng`
                    : "Miễn phí cover charge",
            included: perks.unlimited_cover_charge || Boolean(perks.monthly_cover_vouchers),
        },
        {
            label: perks.squad_discount_percent > 0 ? `Giảm ${perks.squad_discount_percent}% khi đặt nhóm` : "Ưu đãi đặt nhóm",
            included: perks.squad_discount_percent > 0,
        },
        { label: "Đảm bảo có bàn VIP tại venue đối tác", included: perks.guaranteed_vip_table },
        { label: "Concierge hotline riêng 24/7", included: Boolean(perks.concierge_hotline) },
        {
            label: perks.bar_tour_discount_percent > 0 ? `Giảm ${perks.bar_tour_discount_percent}% Bar Tour ĐNA` : "Ưu đãi Bar Tour ĐNA",
            included: perks.bar_tour_discount_percent > 0,
        },
    ];
}

export function MembershipTierCard({
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
    return (
        <div
            className={[
                "relative flex flex-col overflow-hidden rounded-xl border-2 p-6",
                isFeatured ? "border-amber-border shadow-[0_0_0_4px_var(--color-amber-wash)]" : "border-border",
            ].join(" ")}
        >
            {isFeatured && (
                <span className="absolute right-0 top-0 rounded-bl-lg bg-amber px-3.5 py-1 font-display text-[10px] font-extrabold tracking-wide text-void">
                    PHỔ BIẾN
                </span>
            )}
            <p className="mb-2.5 font-display text-[11px] font-bold uppercase tracking-wide text-muted">{tier.name}</p>
            <p className="mb-1 font-display text-3xl font-extrabold">
                {tier.price_vnd > 0 ? formatVnd(tier.price_vnd) : "Miễn phí"}
                {tier.billing_period === "monthly" && <span className="text-base font-normal text-muted"> / tháng</span>}
            </p>
            <p className="mb-4 text-[13px] text-muted">{tier.description}</p>
            <div className="mb-5 flex flex-1 flex-col gap-2">
                {perkLines(tier.perks).map((perk) => (
                    <div key={perk.label} className={["flex items-start gap-2 text-[13px]", perk.included ? "text-white" : "text-muted-2"].join(" ")}>
                        <span className={perk.included ? "text-amber" : "text-muted-2"}>{perk.included ? "✓" : "—"}</span>
                        {perk.label}
                    </div>
                ))}
            </div>
            {isCurrent ? (
                <div className="rounded-lg border-[1.5px] border-border-strong py-2.5 text-center font-display text-[13.5px] font-bold text-muted">
                    Đang dùng
                </div>
            ) : (
                children
            )}
        </div>
    );
}
