import Link from "next/link";
import type { Metadata } from "next";
import { serverFetch } from "@/lib/api/server";
import type { ArticleListItem, Paginated } from "@/lib/api/types";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/LinkButton";
import { Pagination } from "@/components/ui/Pagination";
import { ARTICLE_CATEGORY_LABEL, ARTICLE_STATUS_LABEL } from "@/lib/format";

export const metadata: Metadata = { title: "Bài viết SEO · Admin Nightlife.vn" };

interface PageProps {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const STATUS_TABS: Array<{ value?: string; label: string }> = [
    { value: undefined, label: "Tất cả" },
    { value: "draft", label: "Bản nháp" },
    { value: "published", label: "Đã đăng" },
    { value: "archived", label: "Đã lưu trữ" },
];

const STATUS_TONE: Record<string, "green" | "gray" | "red"> = {
    published: "green",
    archived: "red",
    draft: "gray",
};

export default async function AdminArticlesPage({ searchParams }: PageProps) {
    const params = await searchParams;
    const page = typeof params.page === "string" ? params.page : "1";
    const status = typeof params.status === "string" ? params.status : undefined;
    const q = typeof params.q === "string" ? params.q : undefined;

    const query = new URLSearchParams({ page, limit: "20" });

    if (status) query.set("status", status);
    if (q) query.set("q", q);

    const result = await serverFetch<Paginated<ArticleListItem>>(`/api/v1/admin/bai-viet?${query.toString()}`);

    function buildHref(nextPage: number) {
        const next = new URLSearchParams(query);
        next.set("page", String(nextPage));

        return `/admin/bai-viet?${next.toString()}`;
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className="mb-1 text-sm font-medium text-muted">Nội dung SEO</p>
                    <h1 className="font-display text-2xl font-extrabold">Bài viết</h1>
                </div>
                <LinkButton href="/admin/bai-viet/new">+ Thêm bài viết</LinkButton>
            </div>

            <div className="flex flex-wrap gap-2">
                {STATUS_TABS.map((tab) => {
                    const href = tab.value ? `/admin/bai-viet?status=${tab.value}` : "/admin/bai-viet";
                    const active = status === tab.value;

                    return (
                        <Link
                            key={tab.value ?? "all"}
                            href={href}
                            className={[
                                "rounded-lg border-[1.5px] px-3.5 py-1.5 text-[13px] font-semibold transition-colors",
                                active
                                    ? "border-amber-border bg-amber-wash text-amber"
                                    : "border-border-strong text-muted hover:border-amber-border hover:text-amber",
                            ].join(" ")}
                        >
                            {tab.label}
                        </Link>
                    );
                })}
            </div>

            <form method="get" className="flex max-w-md gap-2">
                {status && <input type="hidden" name="status" value={status} />}
                <input
                    type="search"
                    name="q"
                    defaultValue={q}
                    placeholder="Tìm tiêu đề, mô tả, từ khoá"
                    className="h-10 flex-1 rounded-lg border-[1.5px] border-border-strong bg-void-3 px-3 text-sm text-white outline-none placeholder:text-muted-2 focus:border-amber"
                />
                <button type="submit" className="h-10 rounded-lg border-[1.5px] border-border-strong px-4 text-sm font-semibold text-muted hover:border-amber-border hover:text-amber">
                    Tìm
                </button>
            </form>

            {result.items.length === 0 ? (
                <EmptyState title="Chưa có bài viết" action={<LinkButton href="/admin/bai-viet/new">+ Tạo bài viết đầu tiên</LinkButton>} />
            ) : (
                <>
                    <Card className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-void-3 text-left text-xs uppercase tracking-wide text-muted">
                                <tr>
                                    <th className="whitespace-nowrap px-4 py-2.5 font-semibold">Tiêu đề</th>
                                    <th className="whitespace-nowrap px-4 py-2.5 font-semibold">SEO</th>
                                    <th className="whitespace-nowrap px-4 py-2.5 font-semibold">Trạng thái</th>
                                    <th className="whitespace-nowrap px-4 py-2.5 font-semibold">Ngày đăng</th>
                                    <th className="whitespace-nowrap px-4 py-2.5 font-semibold">Lượt xem</th>
                                    <th className="px-4 py-2.5" />
                                </tr>
                            </thead>
                            <tbody>
                                {result.items.map((article) => (
                                    <tr key={article.id} className="border-t border-border">
                                        <td className="min-w-72 px-4 py-3">
                                            <p className="font-semibold text-white">{article.title}</p>
                                            <p className="mt-1 text-xs text-muted">/{article.slug}</p>
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-muted">
                                            <div className="flex flex-wrap gap-1.5">
                                                <Badge tone="gray">{ARTICLE_CATEGORY_LABEL[article.category] ?? article.category}</Badge>
                                                {article.city && <Badge tone="cyan">{article.city}</Badge>}
                                                {article.is_featured && <Badge tone="amber">Nổi bật</Badge>}
                                            </div>
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3">
                                            <Badge tone={STATUS_TONE[article.status] ?? "gray"}>
                                                {ARTICLE_STATUS_LABEL[article.status] ?? article.status}
                                            </Badge>
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-muted">
                                            {article.published_at ? new Date(article.published_at).toLocaleString("vi-VN") : "—"}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-muted">{article.view_count}</td>
                                        <td className="whitespace-nowrap px-4 py-3 text-right">
                                            <Link href={`/admin/bai-viet/${article.id}`} className="font-semibold text-amber">
                                                Sửa
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </Card>
                    <Pagination pagination={result.pagination} buildHref={buildHref} />
                </>
            )}
        </div>
    );
}
