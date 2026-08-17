export type MembershipTierKey = "free" | "night_pass" | "black_card";
export type PaidMembershipTierKey = Exclude<MembershipTierKey, "free">;
export type MembershipPaymentMethod = "vnpay" | "momo";
export type MembershipSubscriptionStatus =
    | "pending_payment"
    | "payment_received"
    | "active"
    | "cancelled"
    | "expired"
    | "rejected";

export interface SubscribeMembershipDTO {
    tier: PaidMembershipTierKey;
    payment_method: MembershipPaymentMethod;
}

export interface AdminMembershipSubscriptionQuery {
    status?: MembershipSubscriptionStatus;
    page: number;
    limit: number;
}

export interface MembershipPerks {
    can_view_exclusive_deals: boolean;
    priority_booking_hours: number;
    monthly_cover_vouchers: number | null;
    unlimited_cover_charge: boolean;
    squad_discount_percent: number;
    guaranteed_vip_table: boolean;
    concierge_hotline: string | null;
    bar_tour_discount_percent: number;
}

export interface MembershipTier {
    tier: MembershipTierKey;
    name: string;
    price_vnd: number;
    billing_period: "none" | "monthly";
    description: string;
    perks: MembershipPerks;
}

export interface MembershipUserRow {
    id: string;
    email: string;
    display_name: string;
    membership_tier: string | null;
    membership_expires_at: string | null;
    nightlife_passport_points: number | null;
}

export interface MembershipSubscriptionRow {
    id: string;
    user_id: string;
    tier: PaidMembershipTierKey;
    amount: number;
    status: MembershipSubscriptionStatus;
    payment_method: MembershipPaymentMethod;
    payment_ref: string;
    starts_at: string | null;
    expires_at: string | null;
    auto_renewal: boolean;
    confirmed_at: string | null;
    cancelled_at: string | null;
    created_at: string;
}

export type MembershipSubscriptionRecord = Omit<
    MembershipSubscriptionRow,
    "id" | "starts_at" | "expires_at" | "confirmed_at" | "cancelled_at" | "created_at"
>;

export type MembershipSubscriptionUpdate = Partial<Omit<
    MembershipSubscriptionRow,
    "id" | "user_id" | "created_at"
>>;

export interface MembershipMine {
    user: {
        id: string;
        email: string;
        display_name: string;
    };
    membership: {
        tier: MembershipTierKey;
        stored_tier: string;
        status: "free" | "active" | "expired";
        expires_at: string | null;
        auto_renewal: boolean | null;
        pending_confirmation: boolean;
        perks: MembershipPerks;
    };
    passport: {
        points: number;
    };
}
