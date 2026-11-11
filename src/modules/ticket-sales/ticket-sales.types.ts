import type { PaymentMethod } from "@/modules/payments/payment.types";

export type TicketOrderStatus = "pending" | "paid" | "refunded" | "cancelled";

export type TicketStatus = "valid" | "used" | "refunded" | "cancelled";

export interface PurchaseTicketDTO {
    tier_id: string;
    quantity: number;
    payment_method: PaymentMethod;
}

export interface TicketOrderRow {
    id: string;
    user_id: string;
    event_id: string;
    total_amount: number;
    platform_fee: number;
    status: TicketOrderStatus;
    payment_method: PaymentMethod | null;
    payment_claimed_at: string | null;
    payment_ref: string | null;
    created_at: string;
}

export interface TicketRow {
    id: string;
    tier_id: string;
    event_id: string;
    user_id: string;
    order_id: string;
    ticket_code: string;
    status: TicketStatus;
    checked_in_at: string | null;
    created_at: string;
}

export interface TicketListQuery {
    status?: TicketStatus;
    page: number;
    limit: number;
}

export interface AdminTicketOrderListQuery {
    status?: TicketOrderStatus;
    event_id?: string;
    page: number;
    limit: number;
}

export interface CreateTicketOrderInput {
    userId: string;
    eventId: string;
    totalAmount: number;
    platformFee: number;
    paymentMethod: PaymentMethod;
    paymentRef: string;
    paymentClaimedAt?: string | null;
}

export interface TicketTierSaleRow {
    id: string;
    event_id: string;
    name: string;
    price: number;
    quantity: number;
    sold: number;
    includes: string[] | null;
    sale_starts_at: string | null;
    sale_ends_at: string | null;
}
