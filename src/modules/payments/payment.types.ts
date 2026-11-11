export type PaymentProvider = "vnpay" | "momo";

// Every payment method a ticket order / membership can be paid with. Bank
// transfer is reconciled manually by an admin and never goes through an IPN.
export type PaymentMethod = PaymentProvider | "bank_transfer";

export type BankTransferPurpose = "booking" | "ticket_order" | "membership";

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
