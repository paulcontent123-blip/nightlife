import { z } from "zod";

const DateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const TimeSchema = z.string().regex(/^\d{2}:\d{2}$/);

export const CreateSquadSchema = z.object({
    venue_id: z.string().uuid(),
    booking_date: DateSchema,
    booking_time: TimeSchema,
    party_size: z.number().int().positive().max(100),
    budget_per_person: z.number().int().positive(),
});

export const SplitBillSchema = z.object({
    total_amount: z.number().int().positive(),
});
