import { z } from "zod";

const DateTimeSchema = z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "Invalid datetime",
});

const TicketTierBaseSchema = z.object({
    name: z.string().min(2).max(120),
    price: z.number().int().min(0),
    quantity: z.number().int().positive(),
    includes: z.array(z.string().min(1).max(160)).max(30).optional(),
    sale_starts_at: DateTimeSchema.nullable().optional(),
    sale_ends_at: DateTimeSchema.nullable().optional(),
});

export const CreateTicketTierSchema = TicketTierBaseSchema.superRefine(validateSaleWindow);

export const UpdateTicketTierSchema = TicketTierBaseSchema.partial().superRefine(validateSaleWindow);

function validateSaleWindow(
    tier: {
        sale_starts_at?: string | null;
        sale_ends_at?: string | null;
    },
    context: z.RefinementCtx
) {
    if (!tier.sale_starts_at || !tier.sale_ends_at) {
        return;
    }

    if (Date.parse(tier.sale_ends_at) <= Date.parse(tier.sale_starts_at)) {
        context.addIssue({
            code: "custom",
            path: ["sale_ends_at"],
            message: "sale_ends_at must be after sale_starts_at",
        });
    }
}
