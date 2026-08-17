import { z } from "zod";

const ArticleStatusSchema = z.enum(["draft", "published", "archived"]);
const ArticleCategorySchema = z.enum([
    "guide",
    "listicle",
    "news",
    "review",
    "local_seo",
    "event_guide",
    "deal_guide",
]);
const ArticleSchemaTypeSchema = z.enum(["BlogPosting", "Article", "NewsArticle"]);
const UrlSchema = z.string().url();

export const CreateArticleSchema = z.object({
    slug: z.string().trim().min(2).max(180).optional(),
    title: z.string().trim().min(5).max(180),
    excerpt: z.string().trim().max(500).nullable().optional(),
    content: z.string().trim().min(50).max(100000),
    category: ArticleCategorySchema.default("guide"),
    tags: z.array(z.string().trim().min(1).max(60)).max(20).default([]),
    city: z.string().trim().min(1).max(80).nullable().optional(),
    target_keyword: z.string().trim().min(1).max(160).nullable().optional(),
    meta_title: z.string().trim().min(5).max(70).nullable().optional(),
    meta_description: z.string().trim().min(20).max(170).nullable().optional(),
    canonical_url: UrlSchema.nullable().optional(),
    og_image_url: UrlSchema.nullable().optional(),
    schema_type: ArticleSchemaTypeSchema.default("BlogPosting"),
    status: ArticleStatusSchema.default("draft"),
    is_featured: z.boolean().default(false),
    published_at: z.string().datetime().nullable().optional(),
});

export const UpdateArticleSchema = CreateArticleSchema.partial();

export const PublicArticleListQuerySchema = z.object({
    q: z.string().trim().min(1).max(120).optional(),
    city: z.string().trim().min(1).max(80).optional(),
    category: ArticleCategorySchema.optional(),
    tag: z.string().trim().min(1).max(60).optional(),
    featured: z.enum(["true", "false"]).optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(50).default(12),
}).transform((query) => ({
    ...query,
    featured: query.featured === undefined ? undefined : query.featured === "true",
}));

export const AdminArticleListQuerySchema = PublicArticleListQuerySchema.and(
    z.object({
        status: ArticleStatusSchema.optional(),
    })
);
