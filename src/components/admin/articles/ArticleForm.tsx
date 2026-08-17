"use client";

import { useRef, useState, type FormEvent } from "react";
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
    };
}

function nullable(value: string) {
    const trimmed = value.trim();

    return trimmed ? trimmed : null;
}

export function ArticleForm({ article }: { article?: ArticleDetail }) {
    const router = useRouter();
    const contentRef = useRef<HTMLTextAreaElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const [form, setForm] = useState<ArticleFormState>(() => toFormState(article));
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);
    const [loading, setLoading] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);

    function update<K extends keyof ArticleFormState>(key: K, value: ArticleFormState[K]) {
        setForm((prev) => ({ ...prev, [key]: value }));
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
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Không lưu được bài viết.");
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete() {
        if (!article) return;

        setDeleting(true);
        setError(null);

        try {
            await clientFetch(`/api/v1/admin/bai-viet/${article.id}`, { method: "DELETE" });
            router.push("/admin/bai-viet");
            router.refresh();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Không xoá được bài viết.");
            setDeleting(false);
        }
    }

    async function handleInlineImageUpload(files: FileList | null) {
        const file = files?.[0];

        if (!file) return;

        setUploadingImage(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append("image", file);

            const image = await clientFetch<ArticleImageUploadResult>("/api/v1/admin/bai-viet/images", {
                method: "POST",
                body: formData,
            });

            insertContentAtCursor(`\n\n${image.markdown}\n\n`);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Khong upload duoc anh bai viet.");
        } finally {
            setUploadingImage(false);

            if (imageInputRef.current) {
                imageInputRef.current.value = "";
            }
        }
    }

    function insertContentAtCursor(markdown: string) {
        const textarea = contentRef.current;

        if (!textarea) {
            update("content", `${form.content}${markdown}`);
            return;
        }

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const nextContent = `${form.content.slice(0, start)}${markdown}${form.content.slice(end)}`;

        update("content", nextContent);

        requestAnimationFrame(() => {
            textarea.focus();
            const nextPosition = start + markdown.length;
            textarea.setSelectionRange(nextPosition, nextPosition);
        });
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="flex flex-col gap-4">
                    <FieldGroup label="Tieu de">
                        <Input required value={form.title} onChange={(event) => update("title", event.target.value)} />
                    </FieldGroup>
                    <FieldGroup label="Slug">
                        <Input value={form.slug} onChange={(event) => update("slug", event.target.value)} placeholder="tu-sinh-neu-de-trong" />
                    </FieldGroup>
                    <FieldGroup label="Mo ta ngan">
                        <Textarea value={form.excerpt} onChange={(event) => update("excerpt", event.target.value)} />
                    </FieldGroup>
                    <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-display text-[10.5px] font-bold uppercase tracking-wide text-muted">
                                Noi dung bai viet Markdown
                            </span>
                            <div className="flex flex-wrap items-center gap-2">
                                <button
                                    type="button"
                                    className="h-8 rounded-lg border-[1.5px] border-border-strong px-3 text-xs font-semibold text-muted hover:border-amber-border hover:text-amber disabled:opacity-50"
                                    disabled={uploadingImage}
                                    onClick={() => imageInputRef.current?.click()}
                                >
                                    {uploadingImage ? "Dang upload..." : "+ Chen anh"}
                                </button>
                                <input
                                    ref={imageInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    disabled={uploadingImage}
                                    onChange={(event) => handleInlineImageUpload(event.target.files)}
                                />
                            </div>
                        </div>
                        <Textarea
                            ref={contentRef}
                            required
                            value={form.content}
                            onChange={(event) => update("content", event.target.value)}
                            className="min-h-[420px]"
                            placeholder={"Nhap noi dung bai viet SEO...\n\n## Heading\n\nDoan noi dung.\n\n![Alt text](https://res.cloudinary.com/.../image.jpg)"}
                        />
                        <p className="text-xs leading-5 text-muted-2">
                            Anh inline se duoc upload Cloudinary va chen vao dung vi tri con tro theo cu phap Markdown: ![alt](url). OG image ben duoi van la anh dai dien SEO rieng.
                        </p>
                    </div>
                </div>

                <div className="flex flex-col gap-4 rounded-xl border border-border bg-void-2 p-4">
                    <FieldGroup label="Trang thai">
                        <Select value={form.status} onChange={(event) => update("status", event.target.value)}>
                            <option value="draft">Draft</option>
                            <option value="published">Published</option>
                            <option value="archived">Archived</option>
                        </Select>
                    </FieldGroup>
                    <FieldGroup label="Loai bai SEO">
                        <Select value={form.category} onChange={(event) => update("category", event.target.value)}>
                            <option value="guide">Guide</option>
                            <option value="listicle">Top list / listicle</option>
                            <option value="news">News</option>
                            <option value="review">Review</option>
                            <option value="local_seo">Local SEO</option>
                            <option value="event_guide">Event guide</option>
                            <option value="deal_guide">Deal guide</option>
                        </Select>
                    </FieldGroup>
                    <FieldGroup label="Schema type">
                        <Select value={form.schema_type} onChange={(event) => update("schema_type", event.target.value)}>
                            <option value="BlogPosting">BlogPosting</option>
                            <option value="Article">Article</option>
                            <option value="NewsArticle">NewsArticle</option>
                        </Select>
                    </FieldGroup>
                    <FieldGroup label="City">
                        <Input value={form.city} onChange={(event) => update("city", event.target.value)} placeholder="hcm, hanoi..." />
                    </FieldGroup>
                    <FieldGroup label="Tags">
                        <Input value={form.tags} onChange={(event) => update("tags", event.target.value)} placeholder="bar, Q1, rooftop" />
                    </FieldGroup>
                    <FieldGroup label="Target keyword">
                        <Input value={form.target_keyword} onChange={(event) => update("target_keyword", event.target.value)} placeholder="bar Q1 hcm" />
                    </FieldGroup>
                    <FieldGroup label="Published at">
                        <Input type="datetime-local" value={form.published_at} onChange={(event) => update("published_at", event.target.value)} />
                    </FieldGroup>
                    <label className="flex items-center gap-2 text-sm text-white">
                        <input type="checkbox" className="accent-amber" checked={form.is_featured} onChange={(event) => update("is_featured", event.target.checked)} />
                        Featured article
                    </label>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 rounded-xl border border-border bg-void-2 p-4 md:grid-cols-2">
                <FieldGroup label="Meta title">
                    <Input value={form.meta_title} onChange={(event) => update("meta_title", event.target.value)} />
                </FieldGroup>
                <FieldGroup label="Meta description">
                    <Input value={form.meta_description} onChange={(event) => update("meta_description", event.target.value)} />
                </FieldGroup>
                <FieldGroup label="Canonical URL">
                    <Input value={form.canonical_url} onChange={(event) => update("canonical_url", event.target.value)} />
                </FieldGroup>
                <FieldGroup label="OG image URL">
                    <Input value={form.og_image_url} onChange={(event) => update("og_image_url", event.target.value)} />
                </FieldGroup>
            </div>

            {error && <Alert>{error}</Alert>}
            {saved && <Alert tone="success">Da luu bai viet.</Alert>}

            <div className="flex flex-wrap justify-between gap-3">
                <Button type="submit" disabled={loading}>
                    {loading ? "Dang luu..." : article ? "Luu thay doi" : "Tao bai viet"}
                </Button>
                {article && (
                    <Button type="button" variant="ghost" disabled={deleting} onClick={handleDelete}>
                        {deleting ? "Dang xoa..." : "Xoa bai viet"}
                    </Button>
                )}
            </div>
        </form>
    );
}
