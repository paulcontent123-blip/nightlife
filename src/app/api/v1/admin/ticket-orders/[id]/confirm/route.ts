import { requireAdmin } from "@/modules/auth/auth.guard";
import { failure, success } from "@/modules/auth/auth.response";
import { TicketSalesService } from "@/modules/ticket-sales/ticket-sales.service";

interface RouteContext {
    params: Promise<{
        id: string;
    }>;
}

const ticketSalesService = new TicketSalesService();

export async function POST(_request: Request, context: RouteContext) {
    try {
        await requireAdmin();
        const { id } = await context.params;
        const data = await ticketSalesService.confirmTicketOrder(id);

        return success(data);
    } catch (error) {
        return failure(error);
    }
}
