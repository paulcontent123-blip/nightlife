import { MEMBERSHIP_TIERS, isMembershipTier } from "./membership.constants";
import type {
    MembershipMine,
    MembershipSubscriptionRow,
    MembershipTierKey,
    MembershipUserRow,
} from "./membership.types";

export function mapMembershipMine(row: MembershipUserRow): MembershipMine {
    const storedTier = isMembershipTier(row.membership_tier)
        ? row.membership_tier
        : "free";
    const expiresAt = row.membership_expires_at;
    const isPaidTier = storedTier !== "free";
    const isExpired = isPaidTier && Boolean(expiresAt) && new Date(expiresAt as string).getTime() <= Date.now();
    const effectiveTier: MembershipTierKey = isExpired ? "free" : storedTier;

    return {
        user: {
            id: row.id,
            email: row.email,
            display_name: row.display_name,
        },
        membership: {
            tier: effectiveTier,
            stored_tier: storedTier,
            status: effectiveTier === "free" ? (isExpired ? "expired" : "free") : "active",
            expires_at: expiresAt,
            auto_renewal: null,
            pending_confirmation: false,
            perks: MEMBERSHIP_TIERS[effectiveTier].perks,
        },
        passport: {
            points: row.nightlife_passport_points ?? 0,
        },
    };
}

export function mapMembershipSubscription(row: MembershipSubscriptionRow) {
    return {
        id: row.id,
        user_id: row.user_id,
        tier: row.tier,
        amount: row.amount,
        status: row.status,
        payment_method: row.payment_method,
        payment_ref: row.payment_ref,
        starts_at: row.starts_at,
        expires_at: row.expires_at,
        auto_renewal: row.auto_renewal,
        confirmed_at: row.confirmed_at,
        cancelled_at: row.cancelled_at,
        created_at: row.created_at,
    };
}
