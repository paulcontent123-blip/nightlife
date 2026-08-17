import { z } from "zod";

export const SubscribeMembershipSchema = z.object({
    tier: z.enum(["night_pass", "black_card"]),
    payment_method: z.enum(["vnpay", "momo"]),
});

export const AdminMembershipSubscriptionQuerySchema = z.object({
    status: z.enum(["pending_payment", "payment_received", "active", "cancelled", "expired", "rejected"]).optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
});
