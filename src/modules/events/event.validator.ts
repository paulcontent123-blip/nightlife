import { z } from "zod";

const TimeSchema = z.string().regex(/^\d{2}:\d{2}$/);
const DateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const UrlSchema = z.string().url();

export const CreateEventSchema = z.object({
    slug: z.string().min(2).max(180).optional(),
    title: z.string().min(2).max(180),
    description: z.string().max(5000).nullable().optional(),
    event_date: DateSchema,
    start_time: TimeSchema,
    end_time: TimeSchema.nullable().optional(),
    genre: z.array(z.string().min(1).max(80)).max(20).optional(),
    lineup: z.array(z.string().min(1).max(120)).max(50).optional(),
    thumbnail_url: UrlSchema.nullable().optional(),
    images: z.array(UrlSchema).max(20).optional(),
    is_free: z.boolean().default(false),
    age_restriction: z.number().int().min(18).max(99).default(18),
    total_capacity: z.number().int().positive().nullable().optional(),
    is_active: z.boolean().default(true),
});

export const UpdateEventSchema = CreateEventSchema.partial();

export const EventListQuerySchema = z.object({
    is_active: z.enum(["true", "false"]).optional(),
    date_from: DateSchema.optional(),
    date_to: DateSchema.optional(),
    genre: z.string().min(1).max(80).optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(50),
}).transform((query) => ({
    ...query,
    is_active: query.is_active === undefined ? undefined : query.is_active === "true",
}));
