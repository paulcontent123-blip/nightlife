import { requireAdmin } from "@/modules/auth/auth.guard";
import { failure, readJson, success } from "@/modules/auth/auth.response";
import { TicketTierService } from "@/modules/ticket-tiers/ticket-tier.service";
import type { UpdateTicketTierDTO } from "@/modules/ticket-tiers/ticket-tier.types";

interface RouteContext {
    params: Promise<{
        id: string;
    }>;
}

const ticketTierService = new TicketTierService();

export async function PUT(request: Request, context: RouteContext) {
    try {
        await requireAdmin();
        const { id } = await context.params;
        const body = await readJson<UpdateTicketTierDTO>(request);
        const data = await ticketTierService.updateTicketTier(id, body);

        return success(data);
    } catch (error) {
        return failure(error);
    }
}

export async function DELETE(_request: Request, context: RouteContext) {
    try {
        await requireAdmin();
        const { id } = await context.params;
        const data = await ticketTierService.deleteTicketTier(id);

        return success(data);
    } catch (error) {
        return failure(error);
    }
}
