import { z } from "zod";

export const CreateVenueTableSchema = z.object({
    table_name: z.string().min(1).max(120),
    type: z.string().min(1).max(80).default("standard"),
    capacity: z.number().int().positive().max(100),
    min_spend: z.number().int().min(0).nullable().optional(),
    deposit_required: z.number().int().min(0).default(0),
    is_active: z.boolean().default(true),
});

export const UpdateVenueTableSchema = CreateVenueTableSchema.partial();

export const VenueTableListQuerySchema = z.object({
    is_active: z.enum(["true", "false"]).optional(),
    type: z.string().min(1).max(80).optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(50),
}).transform((query) => ({
    ...query,
    is_active: query.is_active === undefined ? undefined : query.is_active === "true",
}));
