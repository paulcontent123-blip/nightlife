import { createAdminClient } from "@/lib/supabase/admin";
import { AuthException } from "@/modules/auth/auth.errors";
import { mapArticle, mapArticleListItem } from "./article.mapper";
import type {
    ArticleListQuery,
    ArticleListRow,
    ArticleRecord,
    ArticleRow,
} from "./article.types";

const ARTICLES_TABLE = "seo_articles";
const ARTICLE_LIST_COLUMNS = [
    "id",
    "author_id",
    "slug",
    "title",
    "excerpt",
    "category",
    "tags",
    "city",
    "target_keyword",
    "meta_title",
    "meta_description",
    "canonical_url",
    "og_image_url",
    "schema_type",
    "status",
    "is_featured",
    "reading_time_minutes",
    "view_count",
    "published_at",
    "created_at",
    "updated_at",
].join(",");

type UpdateArticleRecord = Partial<ArticleRecord>;
type ArticleListRequest = {
    eq(column: string, value: unknown): ArticleListRequest;
    neq(column: string, value: unknown): ArticleListRequest;
    not(column: string, operator: string, value: unknown): ArticleListRequest;
    lte(column: string, value: unknown): ArticleListRequest;
    contains(column: string, value: unknown): ArticleListRequest;
    or(filters: string): ArticleListRequest;
    order(column: string, options?: Record<string, unknown>): ArticleListRequest;
    range(from: number, to: number): ArticleListRequest & {
        returns<T>(): Promise<{
            data: T | null;
            error: { message: string } | null;
            count: number | null;
        }>;
    };
};

export class ArticleRepository {
    private get supabase() {
        return createAdminClient();
    }

    async listPublic(query: ArticleListQuery) {
        let request = this.createListQuery(query, ARTICLE_LIST_COLUMNS, "planned")
            .eq("status", "published")
            .not("published_at", "is", null)
            .lte("published_at", new Date().toISOString());

        request = this.applySort(request);

        return this.paginate<ArticleListRow>(request, query.page, query.limit);
    }

    async listAdmin(query: ArticleListQuery) {
        let request = this.createListQuery(query, "*", "exact");

        if (query.status) {
            request = request.eq("status", query.status);
        }

        request = this.applySort(request);

        return this.paginate<ArticleListRow>(request, query.page, query.limit);
    }

    async findPublicBySlug(slug: string) {
        const { data, error } = await this.supabase
            .from(ARTICLES_TABLE)
            .select("*")
            .eq("slug", slug)
            .eq("status", "published")
            .not("published_at", "is", null)
            .lte("published_at", new Date().toISOString())
            .maybeSingle<ArticleRow>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return data ? mapArticle(data) : null;
    }

    // Fetches published articles by id, preserving the order of the ids
    // array (the admin's chosen order), not the database's default order.
    async listPublicByIds(ids: string[]) {
        if (ids.length === 0) {
            return [];
        }

        const { data, error } = await this.supabase
            .from(ARTICLES_TABLE)
            .select(ARTICLE_LIST_COLUMNS)
            .in("id", ids)
            .eq("status", "published")
            .not("published_at", "is", null)
            .lte("published_at", new Date().toISOString())
            .returns<ArticleListRow[]>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        const rowsById = new Map((data ?? []).map((row) => [row.id, row]));

        return ids
            .map((id) => rowsById.get(id))
            .filter((row): row is ArticleListRow => Boolean(row))
            .map(mapArticleListItem);
    }

    async findAdminById(id: string) {
        const { data, error } = await this.supabase
            .from(ARTICLES_TABLE)
            .select("*")
            .eq("id", id)
            .maybeSingle<ArticleRow>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return data ? mapArticle(data) : null;
    }

    async create(input: ArticleRecord) {
        const { data, error } = await this.supabase
            .from(ARTICLES_TABLE)
            .insert(input)
            .select("*")
            .single<ArticleRow>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return mapArticle(data);
    }

    async update(id: string, input: UpdateArticleRecord) {
        const { data, error } = await this.supabase
            .from(ARTICLES_TABLE)
            .update(input)
            .eq("id", id)
            .select("*")
            .single<ArticleRow>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return mapArticle(data);
    }

    async delete(id: string) {
        const { data, error } = await this.supabase
            .from(ARTICLES_TABLE)
            .delete()
            .eq("id", id)
            .select("*")
            .single<ArticleRow>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return mapArticle(data);
    }

    async incrementViewCount(id: string, currentViewCount: number) {
        const { error } = await this.supabase
            .from(ARTICLES_TABLE)
            .update({ view_count: currentViewCount + 1 })
            .eq("id", id);

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }
    }

    async slugExists(slug: string, excludeArticleId?: string) {
        let request = this.supabase
            .from(ARTICLES_TABLE)
            .select("id")
            .eq("slug", slug);

        if (excludeArticleId) {
            request = request.neq("id", excludeArticleId);
        }

        const { data, error } = await request.maybeSingle<{ id: string }>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return Boolean(data);
    }

    private createListQuery(
        query: ArticleListQuery,
        columns: string,
        count: "exact" | "planned"
    ) {
        let request = this.supabase
            .from(ARTICLES_TABLE)
            .select(columns, { count }) as unknown as ArticleListRequest;

        if (query.city) {
            request = request.eq("city", query.city);
        }

        if (query.category) {
            request = request.eq("category", query.category);
        }

        if (query.tag) {
            request = request.contains("tags", [query.tag]);
        }

        if (query.featured !== undefined) {
            request = request.eq("is_featured", query.featured);
        }

        if (query.q) {
            request = request.or([
                `title.ilike.%${escapeIlike(query.q)}%`,
                `excerpt.ilike.%${escapeIlike(query.q)}%`,
                `target_keyword.ilike.%${escapeIlike(query.q)}%`,
            ].join(","));
        }

        return request;
    }

    private applySort(request: ArticleListRequest) {
        return request
            .order("is_featured", { ascending: false })
            .order("published_at", { ascending: false, nullsFirst: false })
            .order("created_at", { ascending: false });
    }

    private async paginate<T extends ArticleRow | ArticleListRow>(
        request: ArticleListRequest,
        page: number,
        limit: number
    ) {
        const from = (page - 1) * limit;
        const to = from + limit - 1;
        const { data, error, count } = await request
            .range(from, to)
            .returns<T[]>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        const total = count ?? 0;

        return {
            items: (data ?? []).map(mapArticleListItem),
            pagination: {
                page,
                limit,
                total,
                total_pages: Math.ceil(total / limit),
            },
        };
    }
}

function escapeIlike(value: string) {
    return value.replace(/[%_]/g, "\\$&");
}
