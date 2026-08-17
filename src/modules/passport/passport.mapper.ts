import type { PassportPointTransactionRow } from "./passport.types";

export function mapPassportPointTransaction(row: PassportPointTransactionRow) {
    return {
        id: row.id,
        user_id: row.user_id,
        points: row.points,
        balance_after: row.balance_after,
        source_type: row.source_type,
        source_id: row.source_id,
        description: row.description,
        created_at: row.created_at,
    };
}
