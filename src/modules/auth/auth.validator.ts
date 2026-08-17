import { z } from "zod";

export const RegisterSchema = z.object({

    email: z.email(),

    password: z.string().min(8),

    display_name: z.string().min(3)

});

export const LoginSchema = z.object({

    email: z.email(),

    password: z.string().min(8)

});

export const UpdateProfileSchema = z.object({

    display_name: z.string().min(3).optional(),

    full_name: z.string().min(2).optional(),

    phone: z.string().min(8).max(20).optional(),

    city: z.enum([
        "hcm",
        "hanoi",
        "danang"
    ]).optional(),

    avatar_url: z.string().url().optional()

});

export const GoogleOAuthSchema = z.object({

    redirect_to: z.string().url().optional()

});
