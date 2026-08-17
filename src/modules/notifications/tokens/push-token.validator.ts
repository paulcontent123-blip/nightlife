import { z } from "zod";

export const RegisterPushTokenSchema = z.object({
    token: z.string().trim().min(20).max(4096),
    platform: z.enum(["web", "ios", "android"]).default("web"),
    user_agent: z.string().trim().max(1024).nullable().optional(),
});

export const DeletePushTokenSchema = z.object({
    token: z.string().trim().min(20).max(4096),
});
