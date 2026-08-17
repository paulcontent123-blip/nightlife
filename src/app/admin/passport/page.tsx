import Link from "next/link";
import type { Metadata } from "next";
import { serverFetch } from "@/lib/api/server";
import type { PassportRewardsResult, PassportTransaction, Paginated } from "@/lib/api/types";
import { Card } from "@/components/ui/Card";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { PASSPORT_SOURCE_LABEL } from "@/lib/format";

export const metadata: Metadata = { title: "Passport · Admin Nightlife.vn" };

const STATUS_TABS: Array<{ value?: string; label: string }> = [
    { value: undefined, label: "Tất cả" },
    { value: "venue_checkin", label: "Check-in" },
    { value: "venue_review", label: "Đánh giá" },
    { value: "ticket_order", label: "Mua vé" },
    { value: "reward_redeem", label: "Đổi thưởng" },
];

interface PageProps {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminPassportPage({ searchParams }: PageProps) {
    const params = await searchParams;
    const sourceType = typeof params.source_type === "string" ? params.source_type : undefined;
    const page = typeof params.page === "string" ? params.page : "1";

    const query = new URLSearchParams({ page, limit: "20" });

    if (sourceType) query.set("source_type", sourceType);

    const [transactions, rewards] = await Promise.all([
        serverFetch<Paginated<PassportTransaction>>(`/api/v1/admin/passport/transactions?${query.toString()}`),
        serverFetch<PassportRewardsResult>("/api/v1/passport/rewards"),
    ]);

    function buildHref(nextPage: number) {
        const next = new URLSearchParams(query);
        next.set("page", String(nextPage));

        return `/admin/passport?${next.toString()}`;
    }

    return (
        <div className="flex flex-col gap-6">
            <div>
                <p className="mb-1 text-sm font-medium text-muted">Quản lý</p>
                <h1 className="font-display text-2xl font-extrabold">Passport</h1>
            </div>

            <section>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Danh mục phần thưởng</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {rewards.items.map((reward) => (
                        <Card key={reward.id} className="p-4">
                            <p className="font-display text-sm font-bold text-white">{reward.title}</p>
                            <p className="mt-1 text-xs text-muted">{reward.description}</p>
                            <p className="mt-2 font-display text-lg font-extrabold text-amber">{reward.points} điểm</p>
                        </Card>
                    ))}
                </div>
            </section>

            <section>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
                    Lịch sử điểm toàn hệ thống
                </p>

                <div className="mb-4 flex flex-wrap gap-2">
                    {STATUS_TABS.map((tab) => {
                        const isActive = sourceType === tab.value;
                        const href = tab.value ? `/admin/passport?source_type=${tab.value}` : "/admin/passport";

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

                {transactions.items.length === 0 ? (
                    <EmptyState title="Không có giao dịch nào" description="Thử thay đổi bộ lọc." />
                ) : (
                    <>
                        <Card className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-void-3 text-left text-xs uppercase tracking-wide text-muted">
                                    <tr>
                                        <th className="whitespace-nowrap px-4 py-2.5 font-semibold">User</th>
                                        <th className="whitespace-nowrap px-4 py-2.5 font-semibold">Hoạt động</th>
                                        <th className="whitespace-nowrap px-4 py-2.5 font-semibold">Mô tả</th>
                                        <th className="whitespace-nowrap px-4 py-2.5 font-semibold">Điểm</th>
                                        <th className="whitespace-nowrap px-4 py-2.5 font-semibold">Số dư</th>
                                        <th className="whitespace-nowrap px-4 py-2.5 font-semibold">Thời gian</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transactions.items.map((transaction) => (
                                        <tr key={transaction.id} className="border-t border-border">
                                            <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-muted">
                                                {transaction.user_id.slice(0, 8)}
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-2.5">
                                                {PASSPORT_SOURCE_LABEL[transaction.source_type] ?? transaction.source_type}
                                            </td>
                                            <td className="px-4 py-2.5 text-muted">{transaction.description ?? "—"}</td>
                                            <td
                                                className={[
                                                    "whitespace-nowrap px-4 py-2.5 font-semibold",
                                                    transaction.points >= 0 ? "text-emerald-400" : "text-pink",
                                                ].join(" ")}
                                            >
                                                {transaction.points >= 0 ? `+${transaction.points}` : transaction.points}
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-2.5 text-muted">{transaction.balance_after}</td>
                                            <td className="whitespace-nowrap px-4 py-2.5 text-muted">
                                                {new Date(transaction.created_at).toLocaleString("vi-VN")}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </Card>
                        <Pagination pagination={transactions.pagination} buildHref={buildHref} />
                    </>
                )}
            </section>
        </div>
    );
}
