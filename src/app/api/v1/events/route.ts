import { failure, success } from "@/modules/auth/auth.response";
import { EventService } from "@/modules/events/event.service";

const eventService = new EventService();

export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const data = await eventService.listPublicEvents(url.searchParams);

        return success(data);
    } catch (error) {
        return failure(error);
    }
}
