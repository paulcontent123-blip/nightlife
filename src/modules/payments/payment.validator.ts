import { z } from "zod";

export const CreatePaymentSchema = z.object({
    booking_id: z.string().uuid(),
});

export const PaymentIpnSchema = z.object({
    booking_id: z.string().uuid().optional(),
    ticket_order_id: z.string().uuid().optional(),
    membership_subscription_id: z.string().uuid().optional(),
    purpose: z.enum(["booking", "ticket_order", "membership"]).optional(),
    payment_ref: z.string().min(8).max(120),
    status: z.enum(["success", "failed"]),
    amount: z.number().int().positive(),
    transaction_id: z.string().max(180).optional(),
});
