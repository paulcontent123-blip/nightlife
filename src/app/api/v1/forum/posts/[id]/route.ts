import { failure, success } from "@/modules/auth/auth.response";
import { ForumService } from "@/modules/forums/forum.service";

interface RouteContext {
    params: Promise<{
        id: string;
    }>;
}

const forumService = new ForumService();

export async function GET(_request: Request, context: RouteContext) {
    try {
        const { id } = await context.params;
        const data = await forumService.getPostDetail(id);

        return success(data);
    } catch (error) {
        return failure(error);
    }
}
