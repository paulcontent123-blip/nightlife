import { z } from "zod";

export const PurchaseTicketSchema = z.object({
    tier_id: z.string().uuid(),
    quantity: z.number().int().min(1).max(10),
    payment_method: z.enum(["vnpay", "momo"]),
});

export const TicketListQuerySchema = z.object({
    status: z.enum(["valid", "used", "refunded"]).optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
});

export const AdminTicketOrderListQuerySchema = z.object({
    status: z.enum(["pending", "paid", "refunded"]).optional(),
    event_id: z.string().uuid().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
});
