import { requireAdmin } from "@/modules/auth/auth.guard";
import { failure, success } from "@/modules/auth/auth.response";
import { BookingService } from "@/modules/bookings/booking.service";

const bookingService = new BookingService();

export async function GET(request: Request) {
    try {
        await requireAdmin();
        const url = new URL(request.url);
        const data = await bookingService.listAdmin(url.searchParams);

        return success(data);
    } catch (error) {
        return failure(error);
    }
}
