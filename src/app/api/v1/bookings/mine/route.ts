import { requireAuth } from "@/modules/auth/auth.guard";
import { failure, success } from "@/modules/auth/auth.response";
import { BookingService } from "@/modules/bookings/booking.service";

const bookingService = new BookingService();

export async function GET(request: Request) {
    try {
        const user = await requireAuth();
        const url = new URL(request.url);
        const data = await bookingService.listMine(user, url.searchParams);

        return success(data);
    } catch (error) {
        return failure(error);
    }
}
