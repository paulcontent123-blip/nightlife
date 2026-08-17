import { requireAdmin } from "@/modules/auth/auth.guard";
import { failure, success } from "@/modules/auth/auth.response";
import { TicketSalesService } from "@/modules/ticket-sales/ticket-sales.service";

interface RouteContext {
    params: Promise<{
        code: string;
    }>;
}

const ticketSalesService = new TicketSalesService();

export async function POST(_request: Request, context: RouteContext) {
    try {
        await requireAdmin();
        const { code } = await context.params;
        const data = await ticketSalesService.checkInTicket(code);

        return success(data);
    } catch (error) {
        return failure(error);
    }
}
