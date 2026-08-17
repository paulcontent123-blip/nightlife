import Link from "next/link";
import type { Metadata } from "next";
import { serverFetch } from "@/lib/api/server";
import type { MembershipSubscription, Paginated } from "@/lib/api/types";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { MembershipSubscriptionActions } from "@/components/admin/MembershipSubscriptionActions";
import { formatVnd, MEMBERSHIP_SUB_STATUS_LABEL, MEMBERSHIP_TIER_LABEL } from "@/lib/format";

export const metadata: Metadata = { title: "Membership · Admin Nightlife.vn" };

const STATUS_TABS: Array<{ value?: string; label: string }> = [
    { value: undefined, label: "Tất cả" },
    { value: "pending_payment", label: "Chờ thanh toán" },
    { value: "payment_received", label: "Chờ xác nhận" },
    { value: "active", label: "Đang hoạt động" },
    { value: "cancelled", label: "Đã huỷ" },
    { value: "expired", label: "Hết hạn" },
    { value: "rejected", label: "Đã từ chối" },
];

const STATUS_TONE: Record<string, "amber" | "green" | "gray" | "red"> = {
    pending_payment: "amber",
    payment_received: "amber",
    active: "green",
    cancelled: "gray",
    expired: "gray",
    rejected: "red",
};

interface PageProps {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminMembershipPage({ searchParams }: PageProps) {
    const params = await searchParams;
    const status = typeof params.status === "string" ? params.status : undefined;
    const page = typeof params.page === "string" ? params.page : "1";

    const query = new URLSearchParams({ page, limit: "20" });

    if (status) query.set("status", status);

    const result = await serverFetch<Paginated<MembershipSubscription>>(`/api/v1/admin/membership/subscriptions?${query.toString()}`);

    function buildHref(nextPage: number) {
        const next = new URLSearchParams(query);
        next.set("page", String(nextPage));

        return `/admin/membership?${next.toString()}`;
    }

    return (
        <div className="flex flex-col gap-6">
            <div>
                <p className="mb-1 text-sm font-medium text-muted">Quản lý</p>
                <h1 className="font-display text-2xl font-extrabold">Membership</h1>
            </div>

            <div className="flex flex-wrap gap-2">
                {STATUS_TABS.map((tab) => {
                    const isActive = status === tab.value;
                    const href = tab.value ? `/admin/membership?status=${tab.value}` : "/admin/membership";

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
                <EmptyState title="Không có đăng ký nào" description="Thử thay đổi bộ lọc." />
            ) : (
                <>
                    <Card className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-void-3 text-left text-xs uppercase tracking-wide text-muted">
                                <tr>
                                    <th className="whitespace-nowrap px-4 py-2.5 font-semibold">Mã</th>
                                    <th className="whitespace-nowrap px-4 py-2.5 font-semibold">User</th>
                                    <th className="whitespace-nowrap px-4 py-2.5 font-semibold">Gói</th>
                                    <th className="whitespace-nowrap px-4 py-2.5 font-semibold">Số tiền</th>
                                    <th className="whitespace-nowrap px-4 py-2.5 font-semibold">Thanh toán</th>
                                    <th className="whitespace-nowrap px-4 py-2.5 font-semibold">Trạng thái</th>
                                    <th className="whitespace-nowrap px-4 py-2.5 font-semibold">Tạo lúc</th>
                                    <th className="px-4 py-2.5" />
                                </tr>
                            </thead>
                            <tbody>
                                {result.items.map((subscription) => (
                                    <tr key={subscription.id} className="border-t border-border">
                                        <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-muted">{subscription.id.slice(0, 8)}</td>
                                        <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-muted">{subscription.user_id.slice(0, 8)}</td>
                                        <td className="whitespace-nowrap px-4 py-2.5">{MEMBERSHIP_TIER_LABEL[subscription.tier] ?? subscription.tier}</td>
                                        <td className="whitespace-nowrap px-4 py-2.5">{formatVnd(subscription.amount)}</td>
                                        <td className="whitespace-nowrap px-4 py-2.5 text-muted">{subscription.payment_method}</td>
                                        <td className="whitespace-nowrap px-4 py-2.5">
                                            <Badge tone={STATUS_TONE[subscription.status] ?? "gray"}>
                                                {MEMBERSHIP_SUB_STATUS_LABEL[subscription.status] ?? subscription.status}
                                            </Badge>
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-2.5 text-muted">
                                            {new Date(subscription.created_at).toLocaleString("vi-VN")}
                                        </td>
                                        <td className="px-4 py-2.5 text-right">
                                            <MembershipSubscriptionActions id={subscription.id} status={subscription.status} />
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
