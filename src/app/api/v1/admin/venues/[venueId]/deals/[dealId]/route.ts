import { requireAdmin } from "@/modules/auth/auth.guard";
import { failure, readJson, success } from "@/modules/auth/auth.response";
import { DealService } from "@/modules/deals/deal.service";
import type { UpdateDealDTO } from "@/modules/deals/deal.types";

interface RouteContext {
    params: Promise<{
        venueId: string;
        dealId: string;
    }>;
}

const dealService = new DealService();

export async function GET(_request: Request, context: RouteContext) {
    try {
        await requireAdmin();
        const { venueId, dealId } = await context.params;
        const data = await dealService.getVenueDeal(venueId, dealId);

        return success(data);
    } catch (error) {
        return failure(error);
    }
}

export async function PUT(request: Request, context: RouteContext) {
    try {
        await requireAdmin();
        const { venueId, dealId } = await context.params;
        const body = await readJson<UpdateDealDTO>(request);
        const data = await dealService.updateVenueDeal(venueId, dealId, body);

        return success(data);
    } catch (error) {
        return failure(error);
    }
}

export async function PATCH(request: Request, context: RouteContext) {
    try {
        await requireAdmin();
        const { venueId, dealId } = await context.params;
        const body = await readJson<UpdateDealDTO>(request);
        const data = await dealService.updateVenueDeal(venueId, dealId, body);

        return success(data);
    } catch (error) {
        return failure(error);
    }
}

export async function DELETE(_request: Request, context: RouteContext) {
    try {
        await requireAdmin();
        const { venueId, dealId } = await context.params;
        const data = await dealService.deleteVenueDeal(venueId, dealId);

        return success(data);
    } catch (error) {
        return failure(error);
    }
}
