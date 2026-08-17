import { requireAdmin } from "@/modules/auth/auth.guard";
import { failure, readJson, success } from "@/modules/auth/auth.response";
import { ForumService } from "@/modules/forums/forum.service";
import type { ModerateForumPostDTO } from "@/modules/forums/forum.types";

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
        const data = await forumService.getAdminPost(id);

        return success(data);
    } catch (error) {
        return failure(error);
    }
}

export async function PATCH(request: Request, context: RouteContext) {
    try {
        await requireAdmin();
        const { id } = await context.params;
        const data = await forumService.moderatePost(
            id,
            await readJson<ModerateForumPostDTO>(request)
        );

        return success(data);
    } catch (error) {
        return failure(error);
    }
}

export async function DELETE(_request: Request, context: RouteContext) {
    try {
        await requireAdmin();
        const { id } = await context.params;
        const data = await forumService.deletePost(id);

        return success(data);
    } catch (error) {
        return failure(error);
    }
}
