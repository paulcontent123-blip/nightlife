import { requireAuth } from "@/modules/auth/auth.guard";
import { failure, success } from "@/modules/auth/auth.response";
import { VenueReviewService } from "@/modules/venue-reviews/venue-review.service";

interface RouteContext {
    params: Promise<{
        slug: string;
    }>;
}

const venueReviewService = new VenueReviewService();

export async function GET(_request: Request, context: RouteContext) {
    try {
        const user = await requireAuth();
        const { slug } = await context.params;
        const data = await venueReviewService.listEligibleBookings(slug, user);

        return success(data);
    } catch (error) {
        return failure(error);
    }
}
