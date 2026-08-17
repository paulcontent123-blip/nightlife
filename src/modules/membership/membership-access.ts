import { AuthException } from "@/modules/auth/auth.errors";
import { AuthService } from "@/modules/auth/auth.service";
import { MEMBERSHIP_TIERS } from "./membership.constants";
import { MembershipService } from "./membership.service";

export async function canCurrentUserViewExclusiveDeals() {
    const perks = await getCurrentUserMembershipPerks();

    return perks.can_view_exclusive_deals;
}

export async function getCurrentUserMembershipPerks() {
    try {
        const user = await new AuthService().me();

        return getMembershipPerksForUser(user.id);
    } catch (error) {
        if (error instanceof AuthException && error.code === "UNAUTHORIZED") {
            return MEMBERSHIP_TIERS.free.perks;
        }

        return MEMBERSHIP_TIERS.free.perks;
    }
}

export async function getMembershipPerksForUser(userId: string) {
    const membership = await new MembershipService().getMine(userId);

    return membership.membership.perks;
}
