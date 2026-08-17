import { requireAdmin } from "@/modules/auth/auth.guard";
import { failure, readJson, success } from "@/modules/auth/auth.response";
import { ForumService } from "@/modules/forums/forum.service";
import type { ModerateForumReportDTO } from "@/modules/forums/forum.types";

interface RouteContext {
    params: Promise<{
        id: string;
    }>;
}

const forumService = new ForumService();

export async function PATCH(request: Request, context: RouteContext) {
    try {
        await requireAdmin();
        const { id } = await context.params;
        const data = await forumService.moderateReport(
            id,
            await readJson<ModerateForumReportDTO>(request)
        );

        return success(data);
    } catch (error) {
        return failure(error);
    }
}
