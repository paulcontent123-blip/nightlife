import type { MembershipTier, MembershipTierKey } from "./membership.types";

export const MEMBERSHIP_TIERS: Record<MembershipTierKey, MembershipTier> = {
    free: {
        tier: "free",
        name: "Free",
        price_vnd: 0,
        billing_period: "none",
        description: "Basic access to public nightlife discovery features.",
        perks: {
            can_view_exclusive_deals: false,
            priority_booking_hours: 0,
            monthly_cover_vouchers: 0,
            unlimited_cover_charge: false,
            squad_discount_percent: 0,
            guaranteed_vip_table: false,
            concierge_hotline: null,
            bar_tour_discount_percent: 0,
        },
    },
    night_pass: {
        tier: "night_pass",
        name: "Night Pass",
        price_vnd: 199000,
        billing_period: "monthly",
        description: "Monthly VIP pass for priority booking and exclusive nightlife perks.",
        perks: {
            can_view_exclusive_deals: true,
            priority_booking_hours: 48,
            monthly_cover_vouchers: 2,
            unlimited_cover_charge: false,
            squad_discount_percent: 20,
            guaranteed_vip_table: false,
            concierge_hotline: null,
            bar_tour_discount_percent: 0,
        },
    },
    black_card: {
        tier: "black_card",
        name: "Black Card",
        price_vnd: 499000,
        billing_period: "monthly",
        description: "Premium VIP membership with concierge access and top-tier perks.",
        perks: {
            can_view_exclusive_deals: true,
            priority_booking_hours: 48,
            monthly_cover_vouchers: null,
            unlimited_cover_charge: true,
            squad_discount_percent: 20,
            guaranteed_vip_table: true,
            concierge_hotline: process.env.MEMBERSHIP_CONCIERGE_HOTLINE ?? null,
            bar_tour_discount_percent: 15,
        },
    },
};

export function isMembershipTier(value: string | null | undefined): value is MembershipTierKey {
    return value === "free" || value === "night_pass" || value === "black_card";
}
