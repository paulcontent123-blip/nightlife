import Link from "next/link";
import type { Metadata } from "next";
import { serverFetch } from "@/lib/api/server";
import type { Paginated, TicketOrder } from "@/lib/api/types";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { TicketOrderConfirmButton } from "@/components/admin/TicketOrderConfirmButton";
import { formatVnd, TICKET_ORDER_STATUS_LABEL } from "@/lib/format";

export const metadata: Metadata = { title: "Vé sự kiện · Admin Nightlife.vn" };

const STATUS_TABS: Array<{ value?: string; label: string }> = [
    { value: undefined, label: "Tất cả" },
    { value: "pending", label: "Chờ xác nhận" },
    { value: "paid", label: "Đã phát hành" },
    { value: "refunded", label: "Đã hoàn tiền" },
];

const STATUS_TONE: Record<string, "amber" | "green" | "gray"> = {
    pending: "amber",
    paid: "green",
    refunded: "gray",
};

interface PageProps {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminTicketOrdersPage({ searchParams }: PageProps) {
    const params = await searchParams;
    const status = typeof params.status === "string" ? params.status : undefined;
    const page = typeof params.page === "string" ? params.page : "1";

    const query = new URLSearchParams({ page, limit: "20" });

    if (status) query.set("status", status);

    const result = await serverFetch<Paginated<TicketOrder>>(`/api/v1/admin/ticket-orders?${query.toString()}`);

    function buildHref(nextPage: number) {
        const next = new URLSearchParams(query);
        next.set("page", String(nextPage));

        return `/admin/ticket-orders?${next.toString()}`;
    }

    return (
        <div className="flex flex-col gap-6">
            <div>
                <p className="mb-1 text-sm font-medium text-muted">Quản lý</p>
                <h1 className="font-display text-2xl font-extrabold">Vé sự kiện</h1>
            </div>

            <div className="flex flex-wrap gap-2">
                {STATUS_TABS.map((tab) => {
                    const isActive = status === tab.value;
                    const href = tab.value ? `/admin/ticket-orders?status=${tab.value}` : "/admin/ticket-orders";

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
                <EmptyState title="Không có đơn vé nào" description="Thử thay đổi bộ lọc." />
            ) : (
                <>
                    <Card className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-void-3 text-left text-xs uppercase tracking-wide text-muted">
                                <tr>
                                    <th className="whitespace-nowrap px-4 py-2.5 font-semibold">Mã đơn</th>
                                    <th className="whitespace-nowrap px-4 py-2.5 font-semibold">Sự kiện</th>
                                    <th className="whitespace-nowrap px-4 py-2.5 font-semibold">Tổng tiền</th>
                                    <th className="whitespace-nowrap px-4 py-2.5 font-semibold">Thanh toán</th>
                                    <th className="whitespace-nowrap px-4 py-2.5 font-semibold">Trạng thái</th>
                                    <th className="whitespace-nowrap px-4 py-2.5 font-semibold">Tạo lúc</th>
                                    <th className="px-4 py-2.5" />
                                </tr>
                            </thead>
                            <tbody>
                                {result.items.map((order) => (
                                    <tr key={order.id} className="border-t border-border">
                                        <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-muted">{order.id.slice(0, 8)}</td>
                                        <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-muted">{order.event_id.slice(0, 8)}</td>
                                        <td className="whitespace-nowrap px-4 py-2.5">{formatVnd(order.total_amount)}</td>
                                        <td className="whitespace-nowrap px-4 py-2.5 text-muted">{order.payment_method ?? "—"}</td>
                                        <td className="whitespace-nowrap px-4 py-2.5">
                                            <Badge tone={STATUS_TONE[order.status] ?? "gray"}>
                                                {TICKET_ORDER_STATUS_LABEL[order.status] ?? order.status}
                                            </Badge>
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-2.5 text-muted">
                                            {new Date(order.created_at).toLocaleString("vi-VN")}
                                        </td>
                                        <td className="px-4 py-2.5 text-right">
                                            {order.status === "pending" && <TicketOrderConfirmButton orderId={order.id} />}
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
