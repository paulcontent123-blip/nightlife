"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { clientFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/envelope";
import type {
    ArticleDetail,
    ArticleImageUploadResult,
    CreateArticleDTO,
    UpdateArticleDTO,
} from "@/lib/api/types";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FieldGroup, Input, Select, Textarea } from "@/components/ui/Field";
import { ArticleEditorGuide } from "@/components/admin/articles/ArticleEditorGuide";
import { ArticleMarkdownEditor } from "@/components/admin/articles/ArticleMarkdownEditor";
import { RelatedArticlesPicker } from "@/components/admin/articles/RelatedArticlesPicker";

interface ArticleFormState {
    slug: string;
    title: string;
    excerpt: string;
    content: string;
    category: string;
    tags: string;
    city: string;
    target_keyword: string;
    meta_title: string;
    meta_description: string;
    canonical_url: string;
    og_image_url: string;
    schema_type: string;
    status: string;
    is_featured: boolean;
    published_at: string;
    related_article_ids: string[];
}

const DEFAULT_FORM: ArticleFormState = {
    slug: "",
    title: "",
    excerpt: "",
    content: "",
    category: "guide",
    tags: "",
    city: "",
    target_keyword: "",
    meta_title: "",
    meta_description: "",
    canonical_url: "",
    og_image_url: "",
    schema_type: "BlogPosting",
    status: "draft",
    is_featured: false,
    published_at: "",
    related_article_ids: [],
};

function toFormState(article?: ArticleDetail): ArticleFormState {
    if (!article) return DEFAULT_FORM;

    return {
        slug: article.slug,
        title: article.title,
        excerpt: article.excerpt ?? "",
        content: article.content,
        category: article.category,
        tags: article.tags.join(", "),
        city: article.city ?? "",
        target_keyword: article.target_keyword ?? "",
        meta_title: article.seo.meta_title ?? "",
        meta_description: article.seo.meta_description ?? "",
        canonical_url: article.seo.canonical_url ?? "",
        og_image_url: article.seo.og_image_url ?? "",
        schema_type: article.seo.schema_type,
        status: article.status,
        is_featured: article.is_featured,
        published_at: article.published_at ? article.published_at.slice(0, 16) : "",
        related_article_ids: article.related_article_ids,
    };
}

function nullable(value: string) {
    const trimmed = value.trim();

    return trimmed ? trimmed : null;
}

export function ArticleForm({ article }: { article?: ArticleDetail }) {
    const router = useRouter();
    const ogImageInputRef = useRef<HTMLInputElement>(null);
    const [form, setForm] = useState<ArticleFormState>(() => toFormState(article));
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);
    const [loading, setLoading] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [editorUploading, setEditorUploading] = useState(false);
    const [uploadingOgImage, setUploadingOgImage] = useState(false);
    const [showGuide, setShowGuide] = useState(false);
    const seoPreview = useMemo(() => ({
        title: form.meta_title.trim() || form.title.trim() || "Tiêu đề bài viết",
        description: form.meta_description.trim() || form.excerpt.trim() || "Mô tả bài viết sẽ hiển thị tại đây.",
        url: form.canonical_url.trim() || `nightlife.vn/bai-viet/${form.slug.trim() || "slug-bai-viet"}`,
    }), [form.canonical_url, form.excerpt, form.meta_description, form.meta_title, form.slug, form.title]);
    const busy = loading || deleting || editorUploading || uploadingOgImage;

    function update<K extends keyof ArticleFormState>(key: K, value: ArticleFormState[K]) {
        setForm((previous) => ({ ...previous, [key]: value }));
        setSaved(false);
    }

    function buildPayload(): CreateArticleDTO | UpdateArticleDTO {
        return {
            slug: nullable(form.slug) ?? undefined,
            title: form.title.trim(),
            excerpt: nullable(form.excerpt),
            content: form.content.trim(),
            category: form.category as CreateArticleDTO["category"],
            tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
            city: nullable(form.city),
            target_keyword: nullable(form.target_keyword),
            meta_title: nullable(form.meta_title),
            meta_description: nullable(form.meta_description),
            canonical_url: nullable(form.canonical_url),
            og_image_url: nullable(form.og_image_url),
            schema_type: form.schema_type as CreateArticleDTO["schema_type"],
            status: form.status as CreateArticleDTO["status"],
            is_featured: form.is_featured,
            published_at: form.published_at ? new Date(form.published_at).toISOString() : null,
            related_article_ids: form.related_article_ids,
        };
    }

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();
        setLoading(true);
        setError(null);
        setSaved(false);

        try {
            const data = await clientFetch<ArticleDetail>(
                article ? `/api/v1/admin/bai-viet/${article.id}` : "/api/v1/admin/bai-viet",
                {
                    method: article ? "PATCH" : "POST",
                    body: JSON.stringify(buildPayload()),
                }
            );

            setSaved(true);
            router.refresh();

            if (!article) {
                router.push(`/admin/bai-viet/${data.id}`);
            }
        } catch (caughtError) {
            setError(caughtError instanceof ApiError ? caughtError.message : "Không lưu được bài viết.");
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete() {
        if (!article || !window.confirm("Xóa bài viết này? Thao tác không thể hoàn tác.")) return;

        setDeleting(true);
        setError(null);

        try {
            await clientFetch(`/api/v1/admin/bai-viet/${article.id}`, { method: "DELETE" });
            router.push("/admin/bai-viet");
            router.refresh();
        } catch (caughtError) {
            setError(caughtError instanceof ApiError ? caughtError.message : "Không xóa được bài viết.");
            setDeleting(false);
        }
    }

    async function handleOgImageUpload(file: File | undefined) {
        if (!file) return;

        if (!file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) {
            setError("Ảnh đại diện phải là file ảnh và không lớn hơn 10 MB.");
            resetOgImageInput();
            return;
        }

        setUploadingOgImage(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append("image", file);
            formData.append("alt", form.title.trim() || "Ảnh đại diện bài viết");

            const image = await clientFetch<ArticleImageUploadResult>("/api/v1/admin/bai-viet/images", {
                method: "POST",
                body: formData,
            });

            update("og_image_url", image.url);
        } catch (caughtError) {
            setError(caughtError instanceof ApiError ? caughtError.message : "Không tải được ảnh đại diện.");
        } finally {
            setUploadingOgImage(false);
            resetOgImageInput();
        }
    }

    function resetOgImageInput() {
        if (ogImageInputRef.current) {
            ogImageInputRef.current.value = "";
        }
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="sticky top-3 z-20 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border-strong bg-void-2/95 px-4 py-3 shadow-lg backdrop-blur">
                <div className="flex items-center gap-3">
                    <span className={[
                        "h-2.5 w-2.5 rounded-full",
                        form.status === "published" ? "bg-cyan" : form.status === "archived" ? "bg-pink" : "bg-amber",
                    ].join(" ")} />
                    <div>
                        <p className="text-sm font-semibold text-white">
                            {form.status === "published" ? "Đang xuất bản" : form.status === "archived" ? "Đã lưu trữ" : "Bản nháp"}
                        </p>
                        <p className="text-xs text-muted">
                            {saved ? "Đã lưu thay đổi" : busy ? "Đang xử lý..." : "Sẵn sàng chỉnh sửa"}
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        title="Mở hướng dẫn sử dụng trình soạn thảo"
                        aria-expanded={showGuide}
                        aria-controls="article-editor-guide"
                        className="inline-flex h-8 items-center gap-2 rounded-lg border border-border-strong px-3 text-xs font-bold text-white hover:border-amber hover:text-amber"
                        onClick={() => setShowGuide((current) => !current)}
                    >
                        <span aria-hidden="true" className="flex h-4 w-4 items-center justify-center rounded-full border border-current text-[10px]">
                            ?
                        </span>
                        Hướng dẫn
                    </button>
                    {article && article.status === "published" && (
                        <a
                            href={`/bai-viet/${article.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex h-8 items-center rounded-lg border border-border-strong px-3 text-xs font-bold text-white hover:border-amber hover:text-amber"
                        >
                            Xem bài viết
                        </a>
                    )}
                    {article && (
                        <Button type="button" variant="danger" size="sm" disabled={busy} onClick={() => void handleDelete()}>
                            {deleting ? "Đang xóa..." : "Xóa"}
                        </Button>
                    )}
                    <Button type="submit" size="sm" disabled={busy}>
                        {loading ? "Đang lưu..." : article ? "Lưu thay đổi" : "Tạo bài viết"}
                    </Button>
                </div>
            </div>

            {error && <Alert>{error}</Alert>}
            {saved && <Alert tone="success">Đã lưu bài viết.</Alert>}

            {showGuide && (
                <ArticleEditorGuide onClose={() => setShowGuide(false)} />
            )}

            <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
                <div className="flex min-w-0 flex-col gap-5">
                    <section className="grid gap-4 rounded-lg border border-border bg-void-2 p-4 sm:p-5">
                        <FieldGroup label={`Tiêu đề (${form.title.length}/180)`}>
                            <Input
                                required
                                maxLength={180}
                                value={form.title}
                                onChange={(event) => update("title", event.target.value)}
                                className="h-12 text-base font-semibold"
                                placeholder="Nhập tiêu đề rõ ràng, chứa từ khóa chính"
                            />
                        </FieldGroup>
                        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
                            <FieldGroup label={`Mô tả ngắn (${form.excerpt.length}/500)`}>
                                <Textarea
                                    maxLength={500}
                                    value={form.excerpt}
                                    onChange={(event) => update("excerpt", event.target.value)}
                                    placeholder="Tóm tắt nội dung để hiển thị ở danh sách bài viết"
                                />
                            </FieldGroup>
                            <FieldGroup label="Slug">
                                <Input
                                    value={form.slug}
                                    onChange={(event) => update("slug", event.target.value)}
                                    placeholder="tự-sinh-nếu-để-trống"
                                />
                            </FieldGroup>
                        </div>
                    </section>

                    <ArticleMarkdownEditor
                        value={form.content}
                        articleTitle={form.title}
                        onChange={(content) => update("content", content)}
                        onError={setError}
                        onUploadingChange={setEditorUploading}
                    />
                </div>

                <aside className="flex min-w-0 flex-col gap-5">
                    <section className="flex flex-col gap-4 rounded-lg border border-border bg-void-2 p-4">
                        <h2 className="font-display text-sm font-bold text-white">Xuất bản</h2>
                        <FieldGroup label="Trạng thái">
                            <Select value={form.status} onChange={(event) => update("status", event.target.value)}>
                                <option value="draft">Bản nháp</option>
                                <option value="published">Xuất bản</option>
                                <option value="archived">Lưu trữ</option>
                            </Select>
                        </FieldGroup>
                        <FieldGroup label="Thời gian xuất bản">
                            <Input
                                type="datetime-local"
                                value={form.published_at}
                                onChange={(event) => update("published_at", event.target.value)}
                            />
                        </FieldGroup>
                        <label className="flex items-center gap-2 text-sm text-white">
                            <input
                                type="checkbox"
                                className="h-4 w-4 accent-amber"
                                checked={form.is_featured}
                                onChange={(event) => update("is_featured", event.target.checked)}
                            />
                            Bài viết nổi bật
                        </label>
                    </section>

                    <section className="flex flex-col gap-4 rounded-lg border border-border bg-void-2 p-4">
                        <h2 className="font-display text-sm font-bold text-white">Phân loại và từ khóa</h2>
                        <FieldGroup label="Loại bài SEO">
                            <Select value={form.category} onChange={(event) => update("category", event.target.value)}>
                                <option value="guide">Guide</option>
                                <option value="listicle">Top list / Listicle</option>
                                <option value="news">News</option>
                                <option value="review">Review</option>
                                <option value="local_seo">Local SEO</option>
                                <option value="event_guide">Event guide</option>
                                <option value="deal_guide">Deal guide</option>
                            </Select>
                        </FieldGroup>
                        <FieldGroup label="Schema">
                            <Select value={form.schema_type} onChange={(event) => update("schema_type", event.target.value)}>
                                <option value="BlogPosting">BlogPosting</option>
                                <option value="Article">Article</option>
                                <option value="NewsArticle">NewsArticle</option>
                            </Select>
                        </FieldGroup>
                        <div className="grid grid-cols-2 gap-3">
                            <FieldGroup label="Thành phố">
                                <Input value={form.city} onChange={(event) => update("city", event.target.value)} placeholder="hcm" />
                            </FieldGroup>
                            <FieldGroup label="Từ khóa chính">
                                <Input value={form.target_keyword} onChange={(event) => update("target_keyword", event.target.value)} placeholder="bar Q1 hcm" />
                            </FieldGroup>
                        </div>
                        <FieldGroup label="Tags, cách nhau bằng dấu phẩy">
                            <Input value={form.tags} onChange={(event) => update("tags", event.target.value)} placeholder="bar, Q1, rooftop" />
                        </FieldGroup>
                    </section>

                    <section className="flex flex-col gap-4 rounded-lg border border-border bg-void-2 p-4">
                        <h2 className="font-display text-sm font-bold text-white">Bài viết liên quan</h2>
                        <RelatedArticlesPicker
                            articleId={article?.id}
                            value={form.related_article_ids}
                            onChange={(ids) => update("related_article_ids", ids)}
                        />
                    </section>

                    <section className="flex flex-col gap-4 rounded-lg border border-border bg-void-2 p-4">
                        <h2 className="font-display text-sm font-bold text-white">SEO và chia sẻ</h2>
                        <FieldGroup label={`Meta title (${form.meta_title.length}/70)`}>
                            <Input
                                maxLength={70}
                                value={form.meta_title}
                                onChange={(event) => update("meta_title", event.target.value)}
                            />
                        </FieldGroup>
                        <FieldGroup label={`Meta description (${form.meta_description.length}/170)`}>
                            <Textarea
                                maxLength={170}
                                value={form.meta_description}
                                onChange={(event) => update("meta_description", event.target.value)}
                            />
                        </FieldGroup>
                        <FieldGroup label="Canonical URL">
                            <Input value={form.canonical_url} onChange={(event) => update("canonical_url", event.target.value)} placeholder="https://nightlife.vn/..." />
                        </FieldGroup>

                        <div className="flex flex-col gap-2">
                            <span className="font-display text-[10.5px] font-bold uppercase text-muted">Ảnh đại diện SEO</span>
                            {form.og_image_url ? (
                                <div className="relative overflow-hidden rounded-lg border border-border bg-void-3">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={form.og_image_url} alt="Ảnh đại diện SEO" className="aspect-[16/9] w-full object-cover" />
                                    <button
                                        type="button"
                                        className="absolute right-2 top-2 rounded-md bg-void/90 px-2 py-1 text-xs font-bold text-white hover:text-pink"
                                        onClick={() => update("og_image_url", "")}
                                    >
                                        Xóa ảnh
                                    </button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    className="flex aspect-[16/9] w-full items-center justify-center rounded-lg border border-dashed border-border-strong bg-void-3 text-sm font-semibold text-muted hover:border-amber hover:text-amber"
                                    onClick={() => ogImageInputRef.current?.click()}
                                >
                                    Chọn ảnh từ máy
                                </button>
                            )}
                            <input
                                ref={ogImageInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                disabled={uploadingOgImage}
                                onChange={(event) => void handleOgImageUpload(event.target.files?.[0])}
                            />
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    disabled={uploadingOgImage}
                                    className="h-9 shrink-0 rounded-lg border border-border-strong px-3 text-xs font-bold text-white hover:border-amber hover:text-amber disabled:opacity-50"
                                    onClick={() => ogImageInputRef.current?.click()}
                                >
                                    {uploadingOgImage ? "Đang tải..." : "Tải ảnh"}
                                </button>
                                <Input
                                    type="url"
                                    value={form.og_image_url}
                                    onChange={(event) => update("og_image_url", event.target.value)}
                                    placeholder="Hoặc dán URL ảnh"
                                />
                            </div>
                        </div>

                        <div className="border-t border-border pt-4">
                            <p className="mb-2 text-[10.5px] font-bold uppercase text-muted">Xem trước tìm kiếm</p>
                            <p className="truncate text-xs text-cyan">{seoPreview.url}</p>
                            <p className="mt-1 line-clamp-2 text-base font-semibold text-amber">{seoPreview.title}</p>
                            <p className="mt-1 line-clamp-3 text-xs leading-5 text-muted">{seoPreview.description}</p>
                        </div>
                    </section>
                </aside>
            </div>
        </form>
    );
}
