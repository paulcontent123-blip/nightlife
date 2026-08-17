import { z } from "zod";

const TimeSchema = z.string().regex(/^\d{2}:\d{2}$/);
const DateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const DaySchema = z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]);
const CitySchema = z.enum(["hcm", "hanoi", "danang"]);

export const CreateDealSchema = z.object({
    title: z.string().min(2).max(160),
    description: z.string().max(2000).nullable().optional(),
    discount_type: z.string().min(1).max(80).nullable().optional(),
    discount_value: z.number().int().min(0).nullable().optional(),
    applicable_days: z.array(DaySchema).max(7).optional(),
    start_time: TimeSchema,
    end_time: TimeSchema,
    conditions: z.string().max(1000).nullable().optional(),
    is_exclusive: z.boolean().default(false),
    is_active: z.boolean().default(true),
    valid_until: DateSchema.nullable().optional(),
});

export const UpdateDealSchema = CreateDealSchema.partial();

export const DealListQuerySchema = z.object({
    is_active: z.enum(["true", "false"]).optional(),
    is_exclusive: z.enum(["true", "false"]).optional(),
    day: DaySchema.optional(),
    city: CitySchema.optional(),
    district: z.string().min(1).max(120).optional(),
    active_now: z.enum(["true", "false"]).optional(),
    happy_hour_now: z.enum(["true", "false"]).optional(),
    is_open_now: z.enum(["true", "false"]).optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(50),
}).transform((query) => ({
    ...query,
    is_active: query.is_active === undefined ? undefined : query.is_active === "true",
    is_exclusive: query.is_exclusive === undefined ? undefined : query.is_exclusive === "true",
    active_now: query.active_now === undefined ? undefined : query.active_now === "true",
    happy_hour_now: query.happy_hour_now === undefined ? undefined : query.happy_hour_now === "true",
    is_open_now: query.is_open_now === undefined ? undefined : query.is_open_now === "true",
}));
