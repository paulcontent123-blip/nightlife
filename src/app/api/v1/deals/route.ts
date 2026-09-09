import { failure, success } from "@/modules/auth/auth.response";
import { DealService } from "@/modules/deals/deal.service";
import { getCurrentUserAvailabilityPerks } from "@/modules/membership/membership-availability-access";

const dealService = new DealService();

export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const perks = await getCurrentUserAvailabilityPerks();
        const includeExclusiveDeals = perks.can_view_exclusive_deals;
        const data = await dealService.listPublicDeals(url.searchParams, includeExclusiveDeals);

        return success(data);
    } catch (error) {
        return failure(error);
    }
}
