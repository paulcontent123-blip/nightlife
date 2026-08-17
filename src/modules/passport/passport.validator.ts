import { z } from "zod";

export const PassportRedeemSchema = z.object({
    reward_id: z.enum([
        "free_drink_voucher",
        "free_cover_charge",
        "night_pass_month",
        "black_card_month",
    ]),
});

export const PassportMineQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
});

export const AdminPassportTransactionQuerySchema = z.object({
    source_type: z.enum(["venue_checkin", "venue_review", "ticket_order", "reward_redeem"]).optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
});
