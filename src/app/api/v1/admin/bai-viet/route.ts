import { requireAdmin } from "@/modules/auth/auth.guard";
import { failure, readJson, success } from "@/modules/auth/auth.response";
import { ArticleService } from "@/modules/articles/article.service";
import type { CreateArticleDTO } from "@/modules/articles/article.types";

const articleService = new ArticleService();

export async function GET(request: Request) {
    try {
        await requireAdmin();
        const url = new URL(request.url);
        const data = await articleService.listAdminArticles(url.searchParams);

        return success(data);
    } catch (error) {
        return failure(error);
    }
}

export async function POST(request: Request) {
    try {
        const admin = await requireAdmin();
        const data = await articleService.createArticle(
            await readJson<CreateArticleDTO>(request),
            admin.id
        );

        return success(data, 201);
    } catch (error) {
        return failure(error);
    }
}
