import { forumPostRateLimit } from "@/middleware/rate-limit";
import { requireAuth } from "@/modules/auth/auth.guard";
import { failure, readJson, success } from "@/modules/auth/auth.response";
import { ForumService } from "@/modules/forums/forum.service";
import type { CreateForumPostDTO } from "@/modules/forums/forum.types";

const forumService = new ForumService();

export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const data = await forumService.listPublicPosts(url.searchParams);

        return success(data);
    } catch (error) {
        return failure(error);
    }
}

export async function POST(request: Request) {
    try {
        const user = await requireAuth();
        const rateLimitResponse = await forumPostRateLimit(user.id);

        if (rateLimitResponse) {
            return rateLimitResponse;
        }

        const data = await forumService.createPost(
            await readJson<CreateForumPostDTO>(request),
            user.id
        );

        return success(data, 201);
    } catch (error) {
        return failure(error);
    }
}
