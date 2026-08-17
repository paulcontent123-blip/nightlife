import type { SquadMemberRow, SquadRow } from "./squad.types";

export function mapSquad(row: SquadRow) {
    return {
        id: row.id,
        invite_code: row.invite_code,
        created_by: row.created_by,
        venue_id: row.venue_id,
        booking_date: row.booking_date,
        booking_time: normalizeTime(row.booking_time),
        party_size: row.party_size,
        budget_per_person: row.budget_per_person,
        status: row.status,
        bill_splitting: row.bill_splitting,
        total_bill: row.total_bill,
        created_at: row.created_at,
    };
}

export function mapSquadMember(row: SquadMemberRow) {
    return {
        id: row.id,
        squad_id: row.squad_id,
        user_id: row.user_id,
        role: row.role,
        status: row.status,
        share_amount: row.share_amount,
        paid: row.paid,
        joined_at: row.joined_at,
    };
}

function normalizeTime(value: string) {
    const match = value.match(/^(\d{2}:\d{2})/);

    return match?.[1] ?? value;
}
