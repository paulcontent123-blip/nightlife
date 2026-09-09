import { failure, success } from "@/modules/auth/auth.response";
import { DealService } from "@/modules/deals/deal.service";
import { getCurrentUserAvailabilityPerks } from "@/modules/membership/membership-availability-access";

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
        const perks = await getCurrentUserAvailabilityPerks();
        const includeExclusiveDeals = perks.can_view_exclusive_deals;
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
