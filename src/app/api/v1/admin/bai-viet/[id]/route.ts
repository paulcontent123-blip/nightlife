import { requireAdmin } from "@/modules/auth/auth.guard";
import { failure, readJson, success } from "@/modules/auth/auth.response";
import { ArticleService } from "@/modules/articles/article.service";
import type { UpdateArticleDTO } from "@/modules/articles/article.types";

interface RouteContext {
    params: Promise<{
        id: string;
    }>;
}

const articleService = new ArticleService();

export async function GET(_request: Request, context: RouteContext) {
    try {
        await requireAdmin();
        const { id } = await context.params;
        const data = await articleService.getAdminArticleById(id);

        return success(data);
    } catch (error) {
        return failure(error);
    }
}

export async function PUT(request: Request, context: RouteContext) {
    return updateArticle(request, context);
}

export async function PATCH(request: Request, context: RouteContext) {
    return updateArticle(request, context);
}

export async function DELETE(_request: Request, context: RouteContext) {
    try {
        await requireAdmin();
        const { id } = await context.params;
        const data = await articleService.deleteArticle(id);

        return success(data);
    } catch (error) {
        return failure(error);
    }
}

async function updateArticle(request: Request, context: RouteContext) {
    try {
        await requireAdmin();
        const { id } = await context.params;
        const data = await articleService.updateArticle(
            id,
            await readJson<UpdateArticleDTO>(request)
        );

        return success(data);
    } catch (error) {
        return failure(error);
    }
}
