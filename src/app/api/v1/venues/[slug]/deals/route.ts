import { failure, success } from "@/modules/auth/auth.response";
import { DealService } from "@/modules/deals/deal.service";
import { canCurrentUserViewExclusiveDeals } from "@/modules/membership/membership-access";

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
        const includeExclusiveDeals = await canCurrentUserViewExclusiveDeals();
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
