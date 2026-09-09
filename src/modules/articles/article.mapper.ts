import type { ArticleListRow, ArticleRow } from "./article.types";

export function mapArticle(row: ArticleRow) {
    return {
        id: row.id,
        author_id: row.author_id,
        slug: row.slug,
        title: row.title,
        excerpt: row.excerpt,
        content: row.content,
        category: row.category,
        tags: row.tags ?? [],
        city: row.city,
        target_keyword: row.target_keyword,
        seo: {
            meta_title: row.meta_title,
            meta_description: row.meta_description,
            canonical_url: row.canonical_url,
            og_image_url: row.og_image_url,
            schema_type: row.schema_type,
        },
        status: row.status,
        is_featured: row.is_featured,
        reading_time_minutes: row.reading_time_minutes,
        view_count: row.view_count,
        published_at: row.published_at,
        created_at: row.created_at,
        updated_at: row.updated_at,
    };
}

export function mapArticleListItem(row: ArticleListRow) {
    return {
        id: row.id,
        author_id: row.author_id,
        slug: row.slug,
        title: row.title,
        excerpt: row.excerpt,
        category: row.category,
        tags: row.tags ?? [],
        city: row.city,
        target_keyword: row.target_keyword,
        seo: {
            meta_title: row.meta_title,
            meta_description: row.meta_description,
            canonical_url: row.canonical_url,
            og_image_url: row.og_image_url,
            schema_type: row.schema_type,
        },
        status: row.status,
        is_featured: row.is_featured,
        reading_time_minutes: row.reading_time_minutes,
        view_count: row.view_count,
        published_at: row.published_at,
        created_at: row.created_at,
        updated_at: row.updated_at,
    };
}
