import { failure, success } from "@/modules/auth/auth.response";
import { VenueListService } from "@/modules/venues/venue-list.service";

const venueListService = new VenueListService();

export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const data = await venueListService.listPublicVenues(url.searchParams);

        return success(data);
    } catch (error) {
        return failure(error);
    }
}
