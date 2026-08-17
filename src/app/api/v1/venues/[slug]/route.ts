import { failure, success } from "@/modules/auth/auth.response";
import { canCurrentUserViewExclusiveDeals } from "@/modules/membership/membership-access";
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
        const includeExclusiveDeals = await canCurrentUserViewExclusiveDeals();
        const data = await venueService.getPublicVenueDetailBySlug(slug, includeExclusiveDeals);

        return success(data);
    } catch (error) {
        return failure(error);
    }
}
