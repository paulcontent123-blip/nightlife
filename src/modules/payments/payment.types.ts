export type PaymentProvider = "vnpay" | "momo";

export type MockPaymentStatus = "success" | "failed";

export interface CreatePaymentDTO {
    booking_id: string;
}

export interface PaymentIpnDTO {
    booking_id?: string;
    ticket_order_id?: string;
    membership_subscription_id?: string;
    purpose?: "booking" | "ticket_order" | "membership";
    payment_ref: string;
    status: MockPaymentStatus;
    amount: number;
    transaction_id?: string;
}
