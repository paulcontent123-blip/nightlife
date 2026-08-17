import { z } from "zod";

export const UpdateNotificationPreferenceSchema = z.object({
    happy_hour_push_enabled: z.boolean().optional(),
    happy_hour_city: z.enum(["hcm", "hanoi", "danang"]).nullable().optional(),
    happy_hour_district: z.string().trim().min(1).max(80).nullable().optional(),
});
