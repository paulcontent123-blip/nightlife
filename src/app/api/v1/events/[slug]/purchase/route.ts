import { requireAuth } from "@/modules/auth/auth.guard";
import { failure, readJson, success } from "@/modules/auth/auth.response";
import { TicketSalesService } from "@/modules/ticket-sales/ticket-sales.service";
import type { PurchaseTicketDTO } from "@/modules/ticket-sales/ticket-sales.types";

interface RouteContext {
    params: Promise<{
        slug: string;
    }>;
}

const ticketSalesService = new TicketSalesService();

export async function POST(request: Request, context: RouteContext) {
    try {
        const user = await requireAuth();
        const { slug } = await context.params;
        const body = await readJson<PurchaseTicketDTO>(request);
        const data = await ticketSalesService.purchaseTickets(slug, body, user);

        return success(data, 201);
    } catch (error) {
        return failure(error);
    }
}
