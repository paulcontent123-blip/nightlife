import { failure, success } from "@/modules/auth/auth.response";
import { ArticleService } from "@/modules/articles/article.service";

interface RouteContext {
    params: Promise<{
        slug: string;
    }>;
}

const articleService = new ArticleService();

export async function GET(_request: Request, context: RouteContext) {
    try {
        const { slug } = await context.params;
        const data = await articleService.getPublicArticleBySlug(slug);

        return success(data);
    } catch (error) {
        return failure(error);
    }
}
