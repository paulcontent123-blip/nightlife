import { requireAdmin } from "@/modules/auth/auth.guard";
import { failure, success } from "@/modules/auth/auth.response";
import { ForumService } from "@/modules/forums/forum.service";

const forumService = new ForumService();

export async function GET(request: Request) {
    try {
        await requireAdmin();
        const url = new URL(request.url);
        const data = await forumService.listAdminPosts(url.searchParams);

        return success(data);
    } catch (error) {
        return failure(error);
    }
}
