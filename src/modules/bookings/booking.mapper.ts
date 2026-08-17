import type { BookingRow } from "./booking.types";

export function mapBooking(row: BookingRow) {
    return {
        id: row.id,
        venue_id: row.venue_id,
        table_id: row.table_id,
        user_id: row.user_id,
        booking_date: row.booking_date,
        booking_time: normalizeTime(row.booking_time),
        party_size: row.party_size,
        status: row.status,
        special_requests: row.special_requests,
        deposit: {
            amount: row.deposit_amount,
            paid: row.deposit_paid,
        },
        payment_ref: row.payment_ref,
        confirmed_at: row.confirmed_at,
        cancelled_at: row.cancelled_at,
        reminder_push_sent_at: row.reminder_push_sent_at,
        created_at: row.created_at,
    };
}

function normalizeTime(value: string) {
    const match = value.match(/^(\d{2}:\d{2})/);

    return match?.[1] ?? value;
}
