export type BookingConfirmationSource = "payment" | "manual";

export interface BookingNotificationPayload {
    id: string;
    venue_id: string;
    user_id: string;
    booking_date: string;
    booking_time: string;
    party_size: number;
    status: string;
    special_requests: string | null;
    deposit: {
        amount: number;
        paid: boolean;
    };
    payment_ref: string | null;
    confirmed_at: string | null;
}

export interface BookingNotificationUser {
    id: string;
    email: string;
    display_name: string;
    full_name: string | null;
}

export interface BookingNotificationVenue {
    id: string;
    slug: string;
    name: string;
    address: string;
    district: string | null;
    city: string;
    contact: {
        phone: string | null;
        website: string | null;
        instagram: string | null;
    };
}
