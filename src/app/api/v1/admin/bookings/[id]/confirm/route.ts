import { requireAdmin } from "@/modules/auth/auth.guard";
import { failure, success } from "@/modules/auth/auth.response";
import { BookingService } from "@/modules/bookings/booking.service";

interface RouteContext {
    params: Promise<{
        id: string;
    }>;
}

const bookingService = new BookingService();

export async function POST(_request: Request, context: RouteContext) {
    try {
        await requireAdmin();
        const { id } = await context.params;
        const data = await bookingService.confirmBooking(id);

        return success(data);
    } catch (error) {
        return failure(error);
    }
}
