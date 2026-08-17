import { requireAdmin } from "@/modules/auth/auth.guard";
import { failure, success } from "@/modules/auth/auth.response";
import { TicketSalesService } from "@/modules/ticket-sales/ticket-sales.service";

const ticketSalesService = new TicketSalesService();

export async function GET(request: Request) {
    try {
        await requireAdmin();
        const url = new URL(request.url);
        const data = await ticketSalesService.listAdminOrders(url.searchParams);

        return success(data);
    } catch (error) {
        return failure(error);
    }
}
