import { requireAuth } from "@/modules/auth/auth.guard";
import { failure, success } from "@/modules/auth/auth.response";
import { TicketSalesService } from "@/modules/ticket-sales/ticket-sales.service";

const ticketSalesService = new TicketSalesService();

export async function GET(request: Request) {
    try {
        const user = await requireAuth();
        const url = new URL(request.url);
        const data = await ticketSalesService.listMineTickets(user, url.searchParams);

        return success(data);
    } catch (error) {
        return failure(error);
    }
}
