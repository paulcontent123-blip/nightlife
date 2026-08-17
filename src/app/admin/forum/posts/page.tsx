import Link from "next/link";
import type { Metadata } from "next";
import { serverFetch } from "@/lib/api/server";
import type { ForumPost, Paginated } from "@/lib/api/types";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { ForumPostActions } from "@/components/admin/ForumPostActions";
import { shortUserId } from "@/lib/format";

export const metadata: Metadata = { title: "Forum · Admin Nightlife.vn" };

const STATUS_TABS: Array<{ value?: string; label: string }> = [
    { value: undefined, label: "Tất cả" },
    { value: "approved", label: "Đã duyệt" },
    { value: "pending", label: "Chờ duyệt" },
];

interface PageProps {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminForumPostsPage({ searchParams }: PageProps) {
    const params = await searchParams;
    const status = typeof params.status === "string" ? params.status : undefined;
    const page = typeof params.page === "string" ? params.page : "1";

    const query = new URLSearchParams({ page, limit: "20" });

    if (status) query.set("status", status);

    const result = await serverFetch<Paginated<ForumPost>>(`/api/v1/admin/forum/posts?${query.toString()}`);

    function buildHref(nextPage: number) {
        const next = new URLSearchParams(query);
        next.set("page", String(nextPage));

        return `/admin/forum/posts?${next.toString()}`;
    }

    return (
        <div className="flex flex-col gap-6">
            <div>
                <p className="mb-1 text-sm font-medium text-muted">Quản lý</p>
                <h1 className="font-display text-2xl font-extrabold">Forum</h1>
            </div>

            <div className="flex flex-wrap gap-2">
                {STATUS_TABS.map((tab) => {
                    const isActive = status === tab.value;
                    const href = tab.value ? `/admin/forum/posts?status=${tab.value}` : "/admin/forum/posts";

                    return (
                        <Link
                            key={tab.label}
                            href={href}
                            className={[
                                "rounded-lg border-[1.5px] px-3.5 py-1.5 text-[13px] font-semibold transition-colors",
                                isActive
                                    ? "border-amber-border bg-amber-wash text-amber"
                                    : "border-border-strong text-muted hover:border-amber-border hover:text-amber",
                            ].join(" ")}
                        >
                            {tab.label}
                        </Link>
                    );
                })}
            </div>

            {result.items.length === 0 ? (
                <EmptyState title="Không có bài viết nào" description="Thử thay đổi bộ lọc." />
            ) : (
                <>
                    <div className="flex flex-col gap-2">
                        {result.items.map((post) => (
                            <Card key={post.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                                <div className="min-w-0 flex-1">
                                    <div className="mb-1 flex flex-wrap items-center gap-1.5">
                                        {post.is_pinned && <Badge tone="amber">Ghim</Badge>}
                                        <Badge tone={post.is_approved ? "green" : "gray"}>{post.is_approved ? "Đã duyệt" : "Chờ duyệt"}</Badge>
                                    </div>
                                    <Link href={`/admin/forum/posts/${post.id}`} className="font-display text-sm font-bold text-white hover:text-amber">
                                        {post.title}
                                    </Link>
                                    <p className="mt-0.5 text-xs text-muted">
                                        {shortUserId(post.user_id)} · {post.metrics.reply_count} trả lời · {post.metrics.view_count} lượt xem
                                    </p>
                                </div>
                                <ForumPostActions postId={post.id} isApproved={post.is_approved} isPinned={post.is_pinned} />
                            </Card>
                        ))}
                    </div>
                    <Pagination pagination={result.pagination} buildHref={buildHref} />
                </>
            )}
        </div>
    );
}
