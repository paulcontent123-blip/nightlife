"use client";

import { useEffect, useState } from "react";
import { clientFetch } from "@/lib/api/client";
import type { ArticleListItem, Paginated } from "@/lib/api/types";

const MAX_RELATED = 6;

interface RelatedArticlesPickerProps {
    articleId?: string;
    value: string[];
    onChange: (ids: string[]) => void;
}

export function RelatedArticlesPicker({ articleId, value, onChange }: RelatedArticlesPickerProps) {
    const [articles, setArticles] = useState<ArticleListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    useEffect(() => {
        let active = true;

        clientFetch<Paginated<ArticleListItem>>("/api/v1/admin/bai-viet?status=published&limit=50")
            .then((result) => {
                if (active) setArticles(result.items);
            })
            .catch(() => {})
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, []);

    const candidates = articles.filter((candidate) => candidate.id !== articleId);
    const selected = value
        .map((id) => candidates.find((candidate) => candidate.id === id))
        .filter((candidate): candidate is ArticleListItem => Boolean(candidate));
    const normalizedSearch = search.trim().toLowerCase();
    const results = candidates
        .filter((candidate) => !value.includes(candidate.id))
        .filter((candidate) => !normalizedSearch || candidate.title.toLowerCase().includes(normalizedSearch))
        .slice(0, 20);

    function toggle(id: string) {
        if (value.includes(id)) {
            onChange(value.filter((existingId) => existingId !== id));
        } else if (value.length < MAX_RELATED) {
            onChange([...value, id]);
        }
    }

    return (
        <div className="flex flex-col gap-2.5">
            {selected.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {selected.map((candidate) => (
                        <button
                            key={candidate.id}
                            type="button"
                            onClick={() => toggle(candidate.id)}
                            className="flex items-center gap-1.5 rounded-md border border-amber-border bg-amber-wash px-2.5 py-1 text-xs font-semibold text-amber"
                        >
                            {candidate.title}
                            <span aria-hidden="true">✕</span>
                        </button>
                    ))}
                </div>
            )}

            <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm bài viết để thêm..."
                className="h-9 rounded-lg border-[1.5px] border-border-strong bg-void-3 px-3 text-sm text-white outline-none placeholder:text-muted-2 focus:border-amber"
            />

            <div className="max-h-48 overflow-y-auto rounded-lg border border-border-strong">
                {loading ? (
                    <p className="p-3 text-xs text-muted">Đang tải danh sách bài viết...</p>
                ) : results.length === 0 ? (
                    <p className="p-3 text-xs text-muted">
                        {candidates.length === 0 ? "Chưa có bài viết đã xuất bản nào khác." : "Không tìm thấy bài viết phù hợp."}
                    </p>
                ) : (
                    results.map((candidate) => (
                        <button
                            key={candidate.id}
                            type="button"
                            disabled={value.length >= MAX_RELATED}
                            onClick={() => toggle(candidate.id)}
                            className="block w-full border-t border-border px-3 py-2 text-left text-xs text-muted first:border-t-0 hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {candidate.title}
                        </button>
                    ))
                )}
            </div>

            <p className="text-[11px] text-muted-2">
                Tối đa {MAX_RELATED} bài viết. Nếu không chọn, trang chi tiết sẽ tự gợi ý bài cùng danh mục.
            </p>
        </div>
    );
}
