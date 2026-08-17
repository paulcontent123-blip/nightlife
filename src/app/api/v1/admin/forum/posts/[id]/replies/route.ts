import { requireAdmin } from "@/modules/auth/auth.guard";
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
        await requireAdmin();
        const { id } = await context.params;
        const items = await forumService.listAdminPostReplies(id);

        return success({ items });
    } catch (error) {
        return failure(error);
    }
}
