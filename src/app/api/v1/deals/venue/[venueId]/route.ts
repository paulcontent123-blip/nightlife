import { failure, success } from "@/modules/auth/auth.response";
import { DealService } from "@/modules/deals/deal.service";
import { canCurrentUserViewExclusiveDeals } from "@/modules/membership/membership-access";

interface RouteContext {
    params: Promise<{
        venueId: string;
    }>;
}

const dealService = new DealService();

export async function GET(request: Request, context: RouteContext) {
    try {
        const { venueId } = await context.params;
        const url = new URL(request.url);
        const includeExclusiveDeals = await canCurrentUserViewExclusiveDeals();
        const data = await dealService.listPublicVenueDealsById(
            venueId,
            url.searchParams,
            includeExclusiveDeals
        );

        return success(data);
    } catch (error) {
        return failure(error);
    }
}
