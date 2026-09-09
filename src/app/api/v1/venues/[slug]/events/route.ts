import { failure, success } from "@/modules/auth/auth.response";
import { EventListService } from "@/modules/events/event-list.service";

interface RouteContext {
    params: Promise<{
        slug: string;
    }>;
}

const eventListService = new EventListService();

export async function GET(request: Request, context: RouteContext) {
    try {
        const { slug } = await context.params;
        const url = new URL(request.url);
        const data = await eventListService.listPublicVenueEvents(slug, url.searchParams);

        return success(data);
    } catch (error) {
        return failure(error);
    }
}
