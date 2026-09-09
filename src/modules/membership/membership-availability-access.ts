import { createClient, hasSupabaseAuthCookie } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { MEMBERSHIP_TIERS, isMembershipTier } from "./membership.constants";
import type { MembershipPerks, MembershipTierKey } from "./membership.types";

interface MembershipProfileRow {
    membership_tier: string | null;
    membership_expires_at: string | null;
}

// Availability chỉ cần biết gói hiện tại của user. Tách luồng đọc nhẹ này
// khỏi MembershipService để route public không kéo payment/notification vào bundle.
export async function getCurrentUserAvailabilityPerks(): Promise<MembershipPerks> {
    try {
        if (!(await hasSupabaseAuthCookie())) {
            return MEMBERSHIP_TIERS.free.perks;
        }

        const supabase = await createClient();
        const { data: authData, error: authError } = await supabase.auth.getUser();

        if (authError || !authData.user) {
            return MEMBERSHIP_TIERS.free.perks;
        }

        const { data: profile, error: profileError } = await createAdminClient()
            .from("users")
            .select("membership_tier, membership_expires_at")
            .eq("id", authData.user.id)
            .maybeSingle<MembershipProfileRow>();

        if (profileError || !profile) {
            return MEMBERSHIP_TIERS.free.perks;
        }

        const tier = resolveEffectiveTier(profile);

        return MEMBERSHIP_TIERS[tier].perks;
    } catch {
        // Membership lookup must never make public availability unavailable.
        return MEMBERSHIP_TIERS.free.perks;
    }
}

function resolveEffectiveTier(profile: MembershipProfileRow): MembershipTierKey {
    const storedTier = isMembershipTier(profile.membership_tier)
        ? profile.membership_tier
        : "free";

    const isExpired = storedTier !== "free"
        && Boolean(profile.membership_expires_at)
        && new Date(profile.membership_expires_at as string).getTime() <= Date.now();

    return isExpired ? "free" : storedTier;
}
