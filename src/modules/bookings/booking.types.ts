export type BookingStatus = "pending" | "confirmed" | "seated" | "completed" | "cancelled" | "no_show";

export type BookingPaymentMethod = "vnpay" | "momo" | "stripe" | "cash";

export interface CreateBookingDTO {
    venue_id: string;
    table_id: string;
    booking_date: string;
    booking_time: string;
    party_size: number;
    special_requests?: string | null;
    payment_method?: BookingPaymentMethod;
}

export interface BookingListQuery {
    status?: BookingStatus;
    page: number;
    limit: number;
}

export interface AdminBookingListQuery extends BookingListQuery {
    venue_id?: string;
    booking_date?: string;
}

export interface BookingRow {
    id: string;
    venue_id: string;
    table_id: string | null;
    user_id: string;
    squad_id: string | null;
    booking_date: string;
    booking_time: string;
    party_size: number;
    status: BookingStatus;
    special_requests: string | null;
    deposit_amount: number;
    deposit_paid: boolean;
    payment_ref: string | null;
    confirmed_at: string | null;
    cancelled_at: string | null;
    reminder_push_sent_at: string | null;
    created_at: string;
}

export interface BookingRecord {
    venue_id: string;
    table_id: string;
    user_id: string;
    squad_id: string | null;
    booking_date: string;
    booking_time: string;
    party_size: number;
    status: BookingStatus;
    special_requests: string | null;
    deposit_amount: number;
    deposit_paid: boolean;
    payment_ref: string | null;
}

export type BookingUpdateRecord = Partial<Pick<
    BookingRow,
    | "status"
    | "cancelled_at"
    | "confirmed_at"
    | "deposit_paid"
    | "payment_ref"
    | "reminder_push_sent_at"
>>;
