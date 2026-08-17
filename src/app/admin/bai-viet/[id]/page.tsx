import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { serverFetch } from "@/lib/api/server";
import { ApiError } from "@/lib/api/envelope";
import type { ArticleDetail } from "@/lib/api/types";
import { ArticleForm } from "@/components/admin/articles/ArticleForm";
import { ARTICLE_STATUS_LABEL } from "@/lib/format";

export const metadata: Metadata = { title: "Sửa bài viết · Admin Nightlife.vn" };

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function EditArticlePage({ params }: PageProps) {
    const { id } = await params;
    let article: ArticleDetail;

    try {
        article = await serverFetch<ArticleDetail>(`/api/v1/admin/bai-viet/${id}`);
    } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
            notFound();
        }

        throw error;
    }

    return (
        <div className="flex flex-col gap-6">
            <div>
                <Link href="/admin/bai-viet" className="text-sm font-semibold text-muted hover:text-amber">
                    ← Quay lại danh sách bài viết
                </Link>
                <h1 className="mt-3 font-display text-2xl font-extrabold">{article.title}</h1>
                <p className="mt-1 text-sm text-muted">
                    Trạng thái: {ARTICLE_STATUS_LABEL[article.status] ?? article.status} / Slug: {article.slug}
                </p>
            </div>
            <ArticleForm article={article} />
        </div>
    );
}
