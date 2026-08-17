import { z } from "zod";

const TagSchema = z.string().trim().min(1).max(40);
const OptionalUuidSchema = z.string().uuid().nullable().optional();

export const ForumPostListQuerySchema = z.object({
    city: z.string().trim().min(1).max(80).optional(),
    tag: z.string().trim().min(1).max(40).optional(),
    venue_id: z.string().uuid().optional(),
    sort: z.enum(["hot", "new", "top"]).default("hot"),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
});

export const AdminForumPostListQuerySchema = ForumPostListQuerySchema.extend({
    status: z.enum(["all", "approved", "pending"]).default("all"),
});

export const ForumReportListQuerySchema = z.object({
    status: z.enum(["open", "reviewed", "dismissed"]).optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
});

export const CreateForumPostSchema = z.object({
    title: z.string().trim().min(3).max(160),
    content: z.string().trim().min(1).max(5000),
    city: z.string().trim().min(1).max(80).nullable().optional(),
    tags: z.array(TagSchema).max(10).default([]),
    venue_id: OptionalUuidSchema,
});

export const CreateForumReplySchema = z.object({
    content: z.string().trim().min(1).max(3000),
    parent_id: OptionalUuidSchema,
});

export const ReportForumPostSchema = z.object({
    reason: z.string().trim().min(2).max(80),
    description: z.string().trim().max(1000).nullable().optional(),
});

export const ModerateForumPostSchema = z.object({
    is_approved: z.boolean().optional(),
    is_pinned: z.boolean().optional(),
}).refine((value) => value.is_approved !== undefined || value.is_pinned !== undefined, {
    message: "At least one moderation field is required",
});

export const ModerateForumReplySchema = z.object({
    is_approved: z.boolean().optional(),
}).refine((value) => value.is_approved !== undefined, {
    message: "At least one moderation field is required",
});

export const ModerateForumReportSchema = z.object({
    status: z.enum(["open", "reviewed", "dismissed"]),
});
