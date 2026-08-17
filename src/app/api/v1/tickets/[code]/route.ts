import { requireAuth } from "@/modules/auth/auth.guard";
import { failure, success } from "@/modules/auth/auth.response";
import { TicketSalesService } from "@/modules/ticket-sales/ticket-sales.service";

interface RouteContext {
    params: Promise<{
        code: string;
    }>;
}

const ticketSalesService = new TicketSalesService();

export async function GET(_request: Request, context: RouteContext) {
    try {
        const user = await requireAuth();
        const { code } = await context.params;
        const data = await ticketSalesService.getTicketByCode(code, user);

        return success(data);
    } catch (error) {
        return failure(error);
    }
}
