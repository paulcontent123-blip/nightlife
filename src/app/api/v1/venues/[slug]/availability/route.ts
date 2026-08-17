import { failure, success } from "@/modules/auth/auth.response";
import { getCurrentUserMembershipPerks } from "@/modules/membership/membership-access";
import { VenueService } from "@/modules/venues/venue.service";

interface RouteContext {
    params: Promise<{
        slug: string;
    }>;
}

const venueService = new VenueService();

export async function GET(request: Request, context: RouteContext) {
    try {
        const { slug } = await context.params;
        const url = new URL(request.url);
        const perks = await getCurrentUserMembershipPerks();
        const data = await venueService.getVenueAvailability(
            slug,
            url.searchParams,
            {
                priorityBookingHours: perks.priority_booking_hours,
                guaranteedVipTable: perks.guaranteed_vip_table,
                conciergeHotline: perks.concierge_hotline,
            }
        );

        return success(data);
    } catch (error) {
        return failure(error);
    }
}
