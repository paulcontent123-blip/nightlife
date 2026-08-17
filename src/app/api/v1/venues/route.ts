import { failure, success } from "@/modules/auth/auth.response";
import { VenueService } from "@/modules/venues/venue.service";

const venueService = new VenueService();

export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const data = await venueService.listPublicVenues(url.searchParams);

        return success(data);
    } catch (error) {
        return failure(error);
    }
}
