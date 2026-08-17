import { z } from "zod";

const BookingStatusSchema = z.enum(["pending", "confirmed", "seated", "completed", "cancelled", "no_show"]);
const DateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const TimeSchema = z.string().regex(/^\d{2}:\d{2}$/);

export const CreateBookingSchema = z.object({
    venue_id: z.string().uuid(),
    table_id: z.string().uuid(),
    booking_date: DateSchema,
    booking_time: TimeSchema,
    party_size: z.number().int().positive().max(100),
    special_requests: z.string().max(1000).nullable().optional(),
    payment_method: z.enum(["vnpay", "momo", "stripe", "cash"]).optional(),
});

export const BookingListQuerySchema = z.object({
    status: BookingStatusSchema.optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
});

export const AdminBookingListQuerySchema = BookingListQuerySchema.extend({
    venue_id: z.string().uuid().optional(),
    booking_date: DateSchema.optional(),
});
