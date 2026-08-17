import { requireAuth } from "@/modules/auth/auth.guard";
import { failure, readJson, success } from "@/modules/auth/auth.response";
import { BookingService } from "@/modules/bookings/booking.service";
import type { CreateBookingDTO } from "@/modules/bookings/booking.types";
import { bookingRateLimit } from "@/middleware/rate-limit";

const bookingService = new BookingService();

export async function POST(request: Request) {
    try {
        const user = await requireAuth();
        const rateLimitResponse = await bookingRateLimit(user.id);

        if (rateLimitResponse) {
            return rateLimitResponse;
        }

        const data = await bookingService.createBooking(
            await readJson<CreateBookingDTO>(request),
            user
        );

        return success(data, 201);
    } catch (error) {
        return failure(error);
    }
}
