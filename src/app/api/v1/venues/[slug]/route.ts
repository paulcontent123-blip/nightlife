import { failure, success } from "@/modules/auth/auth.response";
import { getCurrentUserAvailabilityPerks } from "@/modules/membership/membership-availability-access";
import { VenueService } from "@/modules/venues/venue.service";

interface RouteContext {
    params: Promise<{
        slug: string;
    }>;
}

const venueService = new VenueService();

export async function GET(_request: Request, context: RouteContext) {
    try {
        const { slug } = await context.params;
        const perks = await getCurrentUserAvailabilityPerks();
        const includeExclusiveDeals = perks.can_view_exclusive_deals;
        const data = await venueService.getPublicVenueDetailBySlug(slug, includeExclusiveDeals);

        return success(data);
    } catch (error) {
        return failure(error);
    }
}
