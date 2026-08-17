import { z } from "zod";

const VenueTypeSchema = z.enum([
    "rooftop_bar",
    "club",
    "wine_bar",
    "live_music",
    "terrace",
    "lounge",
]);

const PriceRangeSchema = z.enum(["$", "$$", "$$$", "$$$$"]);

const CitySchema = z.enum(["hcm", "hanoi", "danang"]);

const SubscriptionTierSchema = z.enum(["basic", "premium"]);

const UrlSchema = z.string().url();

export const CreateVenueSchema = z.object({
    basic: z.object({
        name: z.string().min(2).max(160),
        slug: z.string().min(2).max(180).optional(),
        type: VenueTypeSchema,
        description: z.string().max(5000).optional(),
        phone: z.string().max(30).optional(),
        website: UrlSchema.optional(),
        instagram: z.string().max(180).optional(),
    }),
    address: z.object({
        google_place_id: z.string().min(8).optional(),
        address: z.string().min(5).optional(),
        district: z.string().max(80).optional(),
        city: CitySchema.optional(),
        lat: z.number().min(-90).max(90).optional(),
        lng: z.number().min(-180).max(180).optional(),
        marker_lat: z.number().min(-90).max(90).optional(),
        marker_lng: z.number().min(-180).max(180).optional(),
    }).optional(),
    pricing: z.object({
        cover_charge: z.number().int().min(0).optional(),
        price_range: PriceRangeSchema.optional(),
        capacity: z.number().int().positive().optional(),
        min_spend: z.number().int().min(0).optional(),
        dress_code: z.string().max(300).optional(),
        age_restriction: z.number().int().min(18).max(99).optional(),
    }).optional(),
    operations: z.object({
        open_hours: z.record(z.string(), z.string()).optional(),
        is_vip_only: z.boolean().optional(),
        subscription_tier: SubscriptionTierSchema.optional(),
    }).optional(),
    media: z.object({
        thumbnail_url: UrlSchema.optional(),
        images: z.array(UrlSchema).max(20).optional(),
    }).optional(),
    features: z.array(z.string().min(1).max(80)).max(30).optional(),
});

export const UpdateVenueSchema = z.object({
    basic: CreateVenueSchema.shape.basic.partial().optional(),
    address: CreateVenueSchema.shape.address,
    pricing: CreateVenueSchema.shape.pricing,
    operations: CreateVenueSchema.shape.operations.and(
        z.object({
            is_active: z.boolean().optional(),
            is_verified: z.boolean().optional(),
        })
    ).optional(),
    media: CreateVenueSchema.shape.media,
    features: z.array(z.string().min(1).max(80)).max(30).optional(),
});

export const VenueListQuerySchema = z.object({
    city: CitySchema.optional(),
    type: VenueTypeSchema.optional(),
    district: z.string().max(80).optional(),
    price_range: PriceRangeSchema.optional(),
    features: z.string().optional(),
    is_active: z.enum(["true", "false"]).optional(),
    is_open_now: z.enum(["true", "false"]).optional(),
    sort: z.enum(["rating", "popular", "newest"]).default("newest"),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
}).transform((query) => ({
    ...query,
    features: query.features
        ? query.features.split(",").map((feature) => feature.trim()).filter(Boolean)
        : undefined,
    is_active: query.is_active === undefined ? undefined : query.is_active === "true",
    is_open_now: query.is_open_now === undefined ? undefined : query.is_open_now === "true",
}));

export const VenueAvailabilityQuerySchema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    party_size: z.coerce.number().int().positive().max(100),
});

export const VenueNearbyQuerySchema = z.object({
    lat: z.coerce.number().min(-90).max(90),
    lng: z.coerce.number().min(-180).max(180),
    radius: z.coerce.number().int().positive().max(20000).default(2000),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
});
