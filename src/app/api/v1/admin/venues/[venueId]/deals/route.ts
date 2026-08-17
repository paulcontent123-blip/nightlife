import { requireAdmin } from "@/modules/auth/auth.guard";
import { failure, readJson, success } from "@/modules/auth/auth.response";
import { DealService } from "@/modules/deals/deal.service";
import type { CreateDealDTO } from "@/modules/deals/deal.types";

interface RouteContext {
    params: Promise<{
        venueId: string;
    }>;
}

const dealService = new DealService();

export async function GET(request: Request, context: RouteContext) {
    try {
        await requireAdmin();
        const { venueId } = await context.params;
        const url = new URL(request.url);
        const data = await dealService.listVenueDeals(venueId, url.searchParams);

        return success(data);
    } catch (error) {
        return failure(error);
    }
}

export async function POST(request: Request, context: RouteContext) {
    try {
        await requireAdmin();
        const { venueId } = await context.params;
        const body = await readJson<CreateDealDTO>(request);
        const data = await dealService.createVenueDeal(venueId, body);

        return success(data, 201);
    } catch (error) {
        return failure(error);
    }
}
