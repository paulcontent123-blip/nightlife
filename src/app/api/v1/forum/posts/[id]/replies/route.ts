import { requireAuth } from "@/modules/auth/auth.guard";
import { failure, readJson, success } from "@/modules/auth/auth.response";
import { ForumService } from "@/modules/forums/forum.service";
import type { CreateForumReplyDTO } from "@/modules/forums/forum.types";

interface RouteContext {
    params: Promise<{
        id: string;
    }>;
}

const forumService = new ForumService();

export async function POST(request: Request, context: RouteContext) {
    try {
        const user = await requireAuth();
        const { id } = await context.params;
        const data = await forumService.createReply(
            id,
            await readJson<CreateForumReplyDTO>(request),
            user.id
        );

        return success(data, 201);
    } catch (error) {
        return failure(error);
    }
}
