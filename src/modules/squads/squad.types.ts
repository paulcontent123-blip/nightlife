export type SquadStatus = "forming" | "confirmed" | "cancelled" | "completed";

export type SquadMemberRole = "host" | "member";

export type SquadMemberStatus = "invited" | "joined" | "left";

export interface CreateSquadDTO {
    venue_id: string;
    booking_date: string;
    booking_time: string;
    party_size: number;
    budget_per_person: number;
}

export interface SplitBillDTO {
    total_amount: number;
}

export interface SquadRow {
    id: string;
    invite_code: string;
    created_by: string;
    venue_id: string;
    booking_date: string;
    booking_time: string;
    party_size: number;
    budget_per_person: number;
    status: SquadStatus;
    bill_splitting: boolean;
    total_bill: number | null;
    created_at: string;
}

export interface SquadMemberRow {
    id: string;
    squad_id: string;
    user_id: string;
    role: SquadMemberRole;
    status: SquadMemberStatus;
    share_amount: number | null;
    paid: boolean;
    joined_at: string;
}

export type SquadRecord = Omit<SquadRow, "id" | "created_at" | "total_bill"> & {
    total_bill: number | null;
};

export type SquadMemberRecord = Omit<SquadMemberRow, "id" | "joined_at">;
