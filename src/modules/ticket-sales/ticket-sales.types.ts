import type { PaymentProvider } from "@/modules/payments/payment.types";

export type TicketOrderStatus = "pending" | "paid" | "refunded";

export type TicketStatus = "valid" | "used" | "refunded";

export interface PurchaseTicketDTO {
    tier_id: string;
    quantity: number;
    payment_method: PaymentProvider;
}

export interface TicketOrderRow {
    id: string;
    user_id: string;
    event_id: string;
    total_amount: number;
    platform_fee: number;
    status: TicketOrderStatus;
    payment_method: PaymentProvider | null;
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
    paymentMethod: PaymentProvider;
    paymentRef: string;
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
