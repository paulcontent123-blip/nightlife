import { AuthException } from "@/modules/auth/auth.errors";
import { redisGetVersionAndJson, redisJsonSet } from "@/lib/redis/server";
import { ARTICLE_LIST_CACHE_VERSION_KEY, incrementArticleListCacheVersion } from "./article-cache";
import { ArticleListService } from "./article-list.service";
import { ArticleRepository } from "./article.repository";
import {
    AdminArticleListQuerySchema,
    CreateArticleSchema,
    UpdateArticleSchema,
} from "./article.validator";
import type {
    CreateArticleDTO,
    UpdateArticleDTO,
} from "./article.types";

const WORDS_PER_MINUTE = 220;
const ARTICLE_DETAIL_CACHE_TTL_SECONDS = 300;

type PublicArticle = NonNullable<Awaited<ReturnType<ArticleRepository["findPublicBySlug"]>>>;

interface CachedPublicArticle {
    version: number;
    data: PublicArticle;
}

export class ArticleService {
    private readonly articleListService: ArticleListService;

    constructor(private repository = new ArticleRepository()) {
        this.articleListService = new ArticleListService(repository);
    }

    async listPublicArticles(searchParams: URLSearchParams) {
        return this.articleListService.listPublicArticles(searchParams);
    }

    async listAdminArticles(searchParams: URLSearchParams) {
        const query = AdminArticleListQuerySchema.parse(Object.fromEntries(searchParams));

        return this.repository.listAdmin(query);
    }

    async getPublicArticleBySlug(slug: string) {
        const article = await this.getCachedPublicArticle(slug);

        if (!article) {
            throw new AuthException(404, "ARTICLE_NOT_FOUND");
        }

        // View tracking is analytics-only; do not block article rendering on a
        // second database update round trip.
        void this.repository.incrementViewCount(article.id, article.view_count).catch((error) => {
            console.error("Article view count update failed", { article_id: article.id, error });
        });

        return {
            ...article,
            view_count: article.view_count + 1,
            structured_data: this.createStructuredData(article),
        };
    }

    async getPublicArticleMetaBySlug(slug: string) {
        const article = await this.getCachedPublicArticle(slug);

        if (!article) {
            throw new AuthException(404, "ARTICLE_NOT_FOUND");
        }

        return article;
    }

    private async getCachedPublicArticle(slug: string) {
        const cacheKey = `cache:articles:detail:${slug}`;
        let version = 0;
        let redisAvailable = false;

        try {
            const cached = await redisGetVersionAndJson<CachedPublicArticle>(
                ARTICLE_LIST_CACHE_VERSION_KEY,
                cacheKey
            );
            version = cached.version;
            redisAvailable = true;

            if (cached.value && cached.value.version === version) {
                return cached.value.data;
            }
        } catch {
            // Redis is optional; the database remains the source of truth.
        }

        const article = await this.repository.findPublicBySlug(slug);

        if (article && redisAvailable) {
            try {
                await redisJsonSet(cacheKey, { version, data: article }, ARTICLE_DETAIL_CACHE_TTL_SECONDS);
            } catch {
                // Cache failures must not block the public article detail.
            }
        }

        return article;
    }

    async getAdminArticleById(id: string) {
        const article = await this.repository.findAdminById(id);

        if (!article) {
            throw new AuthException(404, "ARTICLE_NOT_FOUND");
        }

        return article;
    }

    async createArticle(input: CreateArticleDTO, adminId: string) {
        const dto = CreateArticleSchema.parse(input);
        const slug = await this.createUniqueSlug(dto.slug ?? dto.title);
        const content = dto.content;
        const publishedAt = this.resolvePublishedAt(dto.status, dto.published_at);

        const article = await this.repository.create({
            author_id: adminId,
            slug,
            title: dto.title,
            excerpt: dto.excerpt ?? createExcerpt(content),
            content,
            category: dto.category,
            tags: dto.tags ?? [],
            city: dto.city ?? null,
            target_keyword: dto.target_keyword ?? null,
            meta_title: dto.meta_title ?? createMetaTitle(dto.title),
            meta_description: dto.meta_description ?? createMetaDescription(dto.excerpt ?? content),
            canonical_url: dto.canonical_url ?? null,
            og_image_url: dto.og_image_url ?? null,
            schema_type: dto.schema_type,
            status: dto.status,
            is_featured: dto.is_featured,
            reading_time_minutes: calculateReadingTime(content),
            published_at: publishedAt,
            related_article_ids: dto.related_article_ids ?? [],
        });

        await incrementArticleListCacheVersion();

        return article;
    }

    async updateArticle(id: string, input: UpdateArticleDTO) {
        const article = await this.getAdminArticleById(id);
        const dto = UpdateArticleSchema.parse(input);
        const content = dto.content ?? article.content;
        const nextStatus = dto.status ?? article.status;
        const shouldGenerateSlug = dto.slug !== undefined || dto.title !== undefined;
        const slug = shouldGenerateSlug
            ? await this.createUniqueSlug(dto.slug ?? dto.title ?? article.title, id)
            : undefined;

        const updatedArticle = await this.repository.update(id, {
            ...(slug ? { slug } : {}),
            ...(dto.title !== undefined ? { title: dto.title } : {}),
            ...(dto.excerpt !== undefined ? { excerpt: dto.excerpt ?? null } : {}),
            ...(dto.content !== undefined ? {
                content: dto.content,
                reading_time_minutes: calculateReadingTime(dto.content),
            } : {}),
            ...(dto.category !== undefined ? { category: dto.category } : {}),
            ...(dto.tags !== undefined ? { tags: dto.tags } : {}),
            ...(dto.city !== undefined ? { city: dto.city ?? null } : {}),
            ...(dto.target_keyword !== undefined ? { target_keyword: dto.target_keyword ?? null } : {}),
            ...(dto.meta_title !== undefined ? { meta_title: dto.meta_title ?? createMetaTitle(dto.title ?? article.title) } : {}),
            ...(dto.meta_description !== undefined ? { meta_description: dto.meta_description ?? createMetaDescription(dto.excerpt ?? content) } : {}),
            ...(dto.canonical_url !== undefined ? { canonical_url: dto.canonical_url ?? null } : {}),
            ...(dto.og_image_url !== undefined ? { og_image_url: dto.og_image_url ?? null } : {}),
            ...(dto.schema_type !== undefined ? { schema_type: dto.schema_type } : {}),
            ...(dto.status !== undefined ? { status: dto.status } : {}),
            ...(dto.is_featured !== undefined ? { is_featured: dto.is_featured } : {}),
            ...(dto.published_at !== undefined || dto.status !== undefined
                ? { published_at: this.resolvePublishedAt(nextStatus, dto.published_at ?? article.published_at) }
                : {}),
            ...(dto.related_article_ids !== undefined
                ? { related_article_ids: dto.related_article_ids.filter((relatedId) => relatedId !== id) }
                : {}),
        });

        await incrementArticleListCacheVersion();

        return updatedArticle;
    }

    async deleteArticle(id: string) {
        await this.getAdminArticleById(id);

        const article = await this.repository.delete(id);

        await incrementArticleListCacheVersion();

        return article;
    }

    private resolvePublishedAt(status: string, requestedPublishedAt?: string | null) {
        if (status !== "published") {
            return requestedPublishedAt ?? null;
        }

        return requestedPublishedAt ?? new Date().toISOString();
    }

    private async createUniqueSlug(value: string, excludeArticleId?: string) {
        const baseSlug = slugify(value);
        let slug = baseSlug;
        let suffix = 1;

        while (await this.repository.slugExists(slug, excludeArticleId)) {
            suffix += 1;
            slug = `${baseSlug}-${suffix}`;
        }

        return slug;
    }

    private createStructuredData(article: PublicArticle) {
        return {
            "@context": "https://schema.org",
            "@type": article.seo.schema_type,
            headline: article.title,
            description: article.seo.meta_description ?? article.excerpt,
            keywords: [article.target_keyword, ...article.tags].filter(Boolean).join(", "),
            datePublished: article.published_at,
            dateModified: article.updated_at,
            image: article.seo.og_image_url ? [article.seo.og_image_url] : undefined,
            author: {
                "@type": "Organization",
                name: "Nightlife.vn",
            },
            publisher: {
                "@type": "Organization",
                name: "Nightlife.vn",
            },
        };
    }
}

function calculateReadingTime(content: string) {
    const words = content.trim().split(/\s+/).filter(Boolean).length;

    return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}

function createExcerpt(content: string) {
    return content.replace(/\s+/g, " ").trim().slice(0, 220);
}

function createMetaTitle(title: string) {
    return title.slice(0, 70);
}

function createMetaDescription(value: string) {
    return value.replace(/\s+/g, " ").trim().slice(0, 160);
}

function slugify(value: string) {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 180) || "bai-viet";
}
