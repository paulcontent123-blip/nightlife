import { requireAuth } from "@/modules/auth/auth.guard";
import { failure, success } from "@/modules/auth/auth.response";
import { BookingService } from "@/modules/bookings/booking.service";

interface RouteContext {
    params: Promise<{
        id: string;
    }>;
}

const bookingService = new BookingService();

export async function PUT(_request: Request, context: RouteContext) {
    try {
        const user = await requireAuth();
        const { id } = await context.params;
        const data = await bookingService.cancelBooking(id, user);

        return success(data);
    } catch (error) {
        return failure(error);
    }
}
