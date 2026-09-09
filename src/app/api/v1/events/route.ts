import { failure, success } from "@/modules/auth/auth.response";
import { EventListService } from "@/modules/events/event-list.service";

const eventListService = new EventListService();

export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const data = await eventListService.listPublicEvents(url.searchParams);

        return success(data);
    } catch (error) {
        return failure(error);
    }
}
