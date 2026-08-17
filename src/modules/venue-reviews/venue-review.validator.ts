import { z } from "zod";

const DateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const RatingSchema = z.number().int().min(1).max(5);
const UrlSchema = z.string().url();

export const CreateVenueReviewSchema = z.object({
    booking_id: z.string().uuid(),
    rating: RatingSchema,
    atmosphere_rating: RatingSchema.nullable().optional(),
    service_rating: RatingSchema.nullable().optional(),
    value_rating: RatingSchema.nullable().optional(),
    content: z.string().max(3000).nullable().optional(),
    visited_date: DateSchema.nullable().optional(),
    images: z.array(UrlSchema).max(10).optional(),
});

export const VenueReviewListQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    sort: z.enum(["newest", "rating"]).default("newest"),
});
