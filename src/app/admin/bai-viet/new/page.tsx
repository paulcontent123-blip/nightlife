import type { Metadata } from "next";
import Link from "next/link";
import { ArticleForm } from "@/components/admin/articles/ArticleForm";

export const metadata: Metadata = { title: "Thêm bài viết · Admin Nightlife.vn" };

export default function NewArticlePage() {
    return (
        <div className="flex flex-col gap-6">
            <div>
                <Link href="/admin/bai-viet" className="text-sm font-semibold text-muted hover:text-amber">
                    ← Quay lại danh sách bài viết
                </Link>
                <h1 className="mt-3 font-display text-2xl font-extrabold">Thêm bài viết SEO</h1>
                <p className="mt-1 text-sm text-muted">
                    Tạo bài guide, listicle, local SEO, event guide hoặc deal guide cho đội ngũ SEO.
                </p>
            </div>
            <ArticleForm />
        </div>
    );
}
