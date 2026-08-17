export type PassportPointSourceType =
    | "venue_checkin"
    | "venue_review"
    | "ticket_order"
    | "reward_redeem";

export type PassportRewardType =
    | "free_drink_voucher"
    | "free_cover_charge"
    | "night_pass_month"
    | "black_card_month";

export interface PassportRedeemDTO {
    reward_id: PassportRewardType;
}

export interface PassportReward {
    id: PassportRewardType;
    title: string;
    points: number;
    description: string;
    fulfillment: "voucher_pending" | "membership_pending";
}

export interface PassportPointTransactionRow {
    id: string;
    user_id: string;
    points: number;
    balance_after: number;
    source_type: PassportPointSourceType;
    source_id: string;
    description: string | null;
    created_at: string;
}

export interface PassportPointTransactionRecord {
    user_id: string;
    points: number;
    balance_after: number;
    source_type: PassportPointSourceType;
    source_id: string;
    description?: string | null;
}

export interface PassportMineQuery {
    page: number;
    limit: number;
}

export interface AdminPassportTransactionQuery {
    source_type?: PassportPointSourceType;
    page: number;
    limit: number;
}
