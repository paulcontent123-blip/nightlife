import { requireAdmin } from "@/modules/auth/auth.guard";
import { failure, readJson, success } from "@/modules/auth/auth.response";
import { TicketTierService } from "@/modules/ticket-tiers/ticket-tier.service";
import type { CreateTicketTierDTO } from "@/modules/ticket-tiers/ticket-tier.types";

interface RouteContext {
    params: Promise<{
        eventId: string;
    }>;
}

const ticketTierService = new TicketTierService();

export async function GET(_request: Request, context: RouteContext) {
    try {
        await requireAdmin();
        const { eventId } = await context.params;
        const items = await ticketTierService.listAdminEventTicketTiers(eventId);

        return success({ items });
    } catch (error) {
        return failure(error);
    }
}

export async function POST(request: Request, context: RouteContext) {
    try {
        await requireAdmin();
        const { eventId } = await context.params;
        const body = await readJson<CreateTicketTierDTO>(request);
        const data = await ticketTierService.createEventTicketTier(eventId, body);

        return success(data, 201);
    } catch (error) {
        return failure(error);
    }
}
