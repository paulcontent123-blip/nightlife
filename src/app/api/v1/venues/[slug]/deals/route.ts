import { failure, success } from "@/modules/auth/auth.response";
import { DealService } from "@/modules/deals/deal.service";
import { getCurrentUserAvailabilityPerks } from "@/modules/membership/membership-availability-access";

interface RouteContext {
    params: Promise<{
        slug: string;
    }>;
}

const dealService = new DealService();

export async function GET(request: Request, context: RouteContext) {
    try {
        const { slug } = await context.params;
        const url = new URL(request.url);
        const perks = await getCurrentUserAvailabilityPerks();
        const includeExclusiveDeals = perks.can_view_exclusive_deals;
        const data = await dealService.listPublicVenueDeals(
            slug,
            url.searchParams,
            includeExclusiveDeals
        );

        return success(data);
    } catch (error) {
        return failure(error);
    }
}
