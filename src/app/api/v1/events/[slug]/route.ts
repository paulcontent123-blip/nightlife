import { failure, success } from "@/modules/auth/auth.response";
import { EventService } from "@/modules/events/event.service";

interface RouteContext {
    params: Promise<{
        slug: string;
    }>;
}

const eventService = new EventService();

export async function GET(_request: Request, context: RouteContext) {
    try {
        const { slug } = await context.params;
        const data = await eventService.getPublicEventBySlug(slug);

        return success(data);
    } catch (error) {
        return failure(error);
    }
}
