import { z } from "zod";

const CitySchema = z.enum(["hcm", "hanoi", "danang"]);
const PriceRangeSchema = z.enum(["$", "$$", "$$$", "$$$$"]);

export const BarTourRecommendationQuerySchema = z.object({
    keyword: z.string().trim().min(1).max(240).optional(),
    city: CitySchema.optional(),
    district: z.string().trim().min(1).max(80).optional(),
    price_range: PriceRangeSchema.optional(),
    party_size: z.coerce.number().int().positive().max(50).optional(),
    limit: z.coerce.number().int().positive().max(20).default(8),
});

export const BarTourRecommendationBodySchema = z.object({
    keyword: z.string().trim().min(1).max(240).optional(),
    city: CitySchema.optional(),
    district: z.string().trim().min(1).max(80).optional(),
    price_range: PriceRangeSchema.optional(),
    party_size: z.number().int().positive().max(50).optional(),
    limit: z.number().int().positive().max(20).optional(),
}).transform((input) => ({
    ...input,
    limit: input.limit ?? 8,
}));
