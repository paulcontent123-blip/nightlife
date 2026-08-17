import { failure, success } from "@/modules/auth/auth.response";
import { ArticleService } from "@/modules/articles/article.service";

const articleService = new ArticleService();

export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const data = await articleService.listPublicArticles(url.searchParams);

        return success(data);
    } catch (error) {
        return failure(error);
    }
}
