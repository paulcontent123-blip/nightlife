import Link from "next/link";
import type { Metadata } from "next";
import { serverFetch } from "@/lib/api/server";
import type { ForumReport, Paginated } from "@/lib/api/types";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { ForumReportActions } from "@/components/admin/ForumReportActions";
import { FORUM_REPORT_STATUS_LABEL } from "@/lib/format";

export const metadata: Metadata = { title: "Báo cáo Forum · Admin Nightlife.vn" };

const STATUS_TABS: Array<{ value?: string; label: string }> = [
    { value: undefined, label: "Tất cả" },
    { value: "open", label: "Chưa xử lý" },
    { value: "reviewed", label: "Đã xem xét" },
    { value: "dismissed", label: "Đã bỏ qua" },
];

const STATUS_TONE: Record<string, "amber" | "green" | "gray"> = {
    open: "amber",
    reviewed: "green",
    dismissed: "gray",
};

interface PageProps {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminForumReportsPage({ searchParams }: PageProps) {
    const params = await searchParams;
    const status = typeof params.status === "string" ? params.status : undefined;
    const page = typeof params.page === "string" ? params.page : "1";

    const query = new URLSearchParams({ page, limit: "20" });

    if (status) query.set("status", status);

    const result = await serverFetch<Paginated<ForumReport>>(`/api/v1/admin/forum/reports?${query.toString()}`);

    function buildHref(nextPage: number) {
        const next = new URLSearchParams(query);
        next.set("page", String(nextPage));

        return `/admin/forum/reports?${next.toString()}`;
    }

    return (
        <div className="flex flex-col gap-6">
            <div>
                <p className="mb-1 text-sm font-medium text-muted">Quản lý</p>
                <h1 className="font-display text-2xl font-extrabold">Báo cáo Forum</h1>
            </div>

            <div className="flex flex-wrap gap-2">
                {STATUS_TABS.map((tab) => {
                    const isActive = status === tab.value;
                    const href = tab.value ? `/admin/forum/reports?status=${tab.value}` : "/admin/forum/reports";

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
                <EmptyState title="Không có báo cáo nào" description="Thử thay đổi bộ lọc." />
            ) : (
                <>
                    <div className="flex flex-col gap-2">
                        {result.items.map((report) => (
                            <Card key={report.id} className="flex flex-wrap items-start justify-between gap-3 p-4">
                                <div className="min-w-0 flex-1">
                                    <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                                        <Badge tone={STATUS_TONE[report.status] ?? "gray"}>
                                            {FORUM_REPORT_STATUS_LABEL[report.status] ?? report.status}
                                        </Badge>
                                        {report.post && !report.post.is_approved && <Badge tone="red">Bài viết đang bị ẩn</Badge>}
                                    </div>
                                    <p className="text-sm font-semibold text-white">Lý do: {report.reason}</p>
                                    {report.description && <p className="mt-0.5 text-xs text-muted">{report.description}</p>}
                                    {report.post ? (
                                        <div className="mt-2 rounded-lg border border-border-strong bg-void-3 p-3">
                                            <p className="text-xs font-semibold text-muted">Bài viết bị báo cáo:</p>
                                            <p className="mt-0.5 line-clamp-2 text-sm text-white">{report.post.title} — {report.post.content}</p>
                                        </div>
                                    ) : (
                                        <p className="mt-2 text-xs text-muted">Bài viết đã bị xoá.</p>
                                    )}
                                    <Link href={`/admin/forum/posts/${report.post_id}`} className="mt-2 inline-block text-xs font-semibold text-amber hover:underline">
                                        Xem bài viết →
                                    </Link>
                                </div>
                                <ForumReportActions reportId={report.id} status={report.status} />
                            </Card>
                        ))}
                    </div>
                    <Pagination pagination={result.pagination} buildHref={buildHref} />
                </>
            )}
        </div>
    );
}
