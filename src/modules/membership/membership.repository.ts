import { createAdminClient } from "@/lib/supabase/admin";
import { AuthException } from "@/modules/auth/auth.errors";
import { mapMembershipMine, mapMembershipSubscription } from "./membership.mapper";
import type {
    AdminMembershipSubscriptionQuery,
    MembershipSubscriptionRecord,
    MembershipSubscriptionRow,
    MembershipSubscriptionStatus,
    MembershipSubscriptionUpdate,
    MembershipUserRow,
    PaidMembershipTierKey,
} from "./membership.types";

const USERS_TABLE = "users";
const MEMBERSHIP_SUBSCRIPTIONS_TABLE = "membership_subscriptions";
const OPEN_SUBSCRIPTION_STATUSES: MembershipSubscriptionStatus[] = ["pending_payment", "payment_received"];

export class MembershipRepository {
    private get supabase() {
        return createAdminClient();
    }

    async findMine(userId: string) {
        const { data, error } = await this.supabase
            .from(USERS_TABLE)
            .select("id, email, display_name, membership_tier, membership_expires_at, nightlife_passport_points")
            .eq("id", userId)
            .maybeSingle<MembershipUserRow>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        if (!data) {
            throw new AuthException(404, "USER_NOT_FOUND");
        }

        return mapMembershipMine(data);
    }

    async findOpenSubscription(userId: string) {
        const { data, error } = await this.supabase
            .from(MEMBERSHIP_SUBSCRIPTIONS_TABLE)
            .select("*")
            .eq("user_id", userId)
            .in("status", OPEN_SUBSCRIPTION_STATUSES)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle<MembershipSubscriptionRow>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return data ? mapMembershipSubscription(data) : null;
    }

    async expireActiveSubscriptions(userId: string, excludeSubscriptionId: string, expiredAt: string) {
        const { error } = await this.supabase
            .from(MEMBERSHIP_SUBSCRIPTIONS_TABLE)
            .update({
                status: "expired",
                auto_renewal: false,
                cancelled_at: expiredAt,
            })
            .eq("user_id", userId)
            .eq("status", "active")
            .neq("id", excludeSubscriptionId);

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }
    }

    async findLatestSubscriptionByStatuses(userId: string, statuses: MembershipSubscriptionStatus[]) {
        const { data, error } = await this.supabase
            .from(MEMBERSHIP_SUBSCRIPTIONS_TABLE)
            .select("*")
            .eq("user_id", userId)
            .in("status", statuses)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle<MembershipSubscriptionRow>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return data ? mapMembershipSubscription(data) : null;
    }

    async createSubscription(input: MembershipSubscriptionRecord) {
        const { data, error } = await this.supabase
            .from(MEMBERSHIP_SUBSCRIPTIONS_TABLE)
            .insert(input)
            .select("*")
            .single<MembershipSubscriptionRow>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return mapMembershipSubscription(data);
    }

    async listSubscriptions(query: AdminMembershipSubscriptionQuery) {
        const from = (query.page - 1) * query.limit;
        const to = from + query.limit - 1;
        let request = this.supabase
            .from(MEMBERSHIP_SUBSCRIPTIONS_TABLE)
            .select("*", { count: "exact" });

        if (query.status) {
            request = request.eq("status", query.status);
        }

        const { data, error, count } = await request
            .order("created_at", { ascending: false })
            .range(from, to)
            .returns<MembershipSubscriptionRow[]>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        const total = count ?? 0;

        return {
            items: (data ?? []).map(mapMembershipSubscription),
            pagination: {
                page: query.page,
                limit: query.limit,
                total,
                total_pages: Math.ceil(total / query.limit),
            },
        };
    }

    async findSubscriptionById(subscriptionId: string) {
        const { data, error } = await this.supabase
            .from(MEMBERSHIP_SUBSCRIPTIONS_TABLE)
            .select("*")
            .eq("id", subscriptionId)
            .maybeSingle<MembershipSubscriptionRow>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return data ? mapMembershipSubscription(data) : null;
    }

    async findSubscriptionByPaymentRef(paymentRef: string) {
        const { data, error } = await this.supabase
            .from(MEMBERSHIP_SUBSCRIPTIONS_TABLE)
            .select("*")
            .eq("payment_ref", paymentRef)
            .maybeSingle<MembershipSubscriptionRow>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return data ? mapMembershipSubscription(data) : null;
    }

    async updateSubscription(subscriptionId: string, input: MembershipSubscriptionUpdate) {
        const { data, error } = await this.supabase
            .from(MEMBERSHIP_SUBSCRIPTIONS_TABLE)
            .update(input)
            .eq("id", subscriptionId)
            .select("*")
            .single<MembershipSubscriptionRow>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return mapMembershipSubscription(data);
    }

    async activateUserMembership(userId: string, tier: PaidMembershipTierKey, expiresAt: string) {
        const { error } = await this.supabase
            .from(USERS_TABLE)
            .update({
                membership_tier: tier,
                membership_expires_at: expiresAt,
            })
            .eq("id", userId);

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }
    }
}
