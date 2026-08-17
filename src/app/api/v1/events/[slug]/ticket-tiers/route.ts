import { failure, success } from "@/modules/auth/auth.response";
import { TicketTierService } from "@/modules/ticket-tiers/ticket-tier.service";

interface RouteContext {
    params: Promise<{
        slug: string;
    }>;
}

const ticketTierService = new TicketTierService();

export async function GET(_request: Request, context: RouteContext) {
    try {
        const { slug } = await context.params;
        const items = await ticketTierService.listPublicEventTicketTiers(slug);

        return success({ items });
    } catch (error) {
        return failure(error);
    }
}
