import { failure, success } from "@/modules/auth/auth.response";
import { getCurrentUserAvailabilityPerks } from "@/modules/membership/membership-availability-access";
import { VenueAvailabilityService } from "@/modules/venues/venue-availability.service";

interface RouteContext {
    params: Promise<{
        slug: string;
    }>;
}

const venueAvailabilityService = new VenueAvailabilityService();

export async function GET(request: Request, context: RouteContext) {
    try {
        const { slug } = await context.params;
        const url = new URL(request.url);
        const perks = await getCurrentUserAvailabilityPerks();
        const data = await venueAvailabilityService.getVenueAvailability(
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
