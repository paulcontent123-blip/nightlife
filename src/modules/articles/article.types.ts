export type ArticleStatus = "draft" | "published" | "archived";
export type ArticleSchemaType = "BlogPosting" | "Article" | "NewsArticle";
export type ArticleCategory =
    | "guide"
    | "listicle"
    | "news"
    | "review"
    | "local_seo"
    | "event_guide"
    | "deal_guide";

export interface ArticleListQuery {
    q?: string;
    city?: string;
    category?: ArticleCategory;
    tag?: string;
    status?: ArticleStatus;
    featured?: boolean;
    page: number;
    limit: number;
}

export interface CreateArticleDTO {
    slug?: string;
    title: string;
    excerpt?: string | null;
    content: string;
    category?: ArticleCategory;
    tags?: string[];
    city?: string | null;
    target_keyword?: string | null;
    meta_title?: string | null;
    meta_description?: string | null;
    canonical_url?: string | null;
    og_image_url?: string | null;
    schema_type?: ArticleSchemaType;
    status?: ArticleStatus;
    is_featured?: boolean;
    published_at?: string | null;
}

export type UpdateArticleDTO = Partial<CreateArticleDTO>;

export interface ArticleRow {
    id: string;
    author_id: string | null;
    slug: string;
    title: string;
    excerpt: string | null;
    content: string;
    category: ArticleCategory;
    tags: string[];
    city: string | null;
    target_keyword: string | null;
    meta_title: string | null;
    meta_description: string | null;
    canonical_url: string | null;
    og_image_url: string | null;
    schema_type: ArticleSchemaType;
    status: ArticleStatus;
    is_featured: boolean;
    reading_time_minutes: number;
    view_count: number;
    published_at: string | null;
    created_at: string;
    updated_at: string;
}

export type ArticleRecord = Omit<ArticleRow, "id" | "view_count" | "created_at" | "updated_at">;
