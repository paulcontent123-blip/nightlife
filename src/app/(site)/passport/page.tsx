import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { serverFetch } from "@/lib/api/server";
import { ApiError } from "@/lib/api/envelope";
import type { PassportMineResult, PassportRewardsResult } from "@/lib/api/types";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Card } from "@/components/ui/Card";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { RedeemRewardButton } from "@/components/passport/RedeemRewardButton";
import { PASSPORT_SOURCE_LABEL } from "@/lib/format";

export const metadata: Metadata = { title: "Nightlife Passport · Nightlife.vn" };

interface PageProps {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function PassportPage({ searchParams }: PageProps) {
    const query = await searchParams;
    const page = typeof query.page === "string" ? query.page : "1";

    let mine: PassportMineResult;
    let rewards: PassportRewardsResult;

    try {
        [mine, rewards] = await Promise.all([
            serverFetch<PassportMineResult>(`/api/v1/passport/mine?page=${page}&limit=10`),
            serverFetch<PassportRewardsResult>("/api/v1/passport/rewards"),
        ]);
    } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
            redirect("/login?next=/passport");
        }

        throw error;
    }

    function buildHref(nextPage: number) {
        return `/passport?page=${nextPage}`;
    }

    return (
        <div className="mx-auto max-w-5xl px-5 py-16 sm:px-10">
            <SectionHeading
                tag="Nightlife Passport"
                title={
                    <>
                        Đi chơi nhiều
                        <br />
                        <em className="not-italic text-amber">— tích điểm nhiều</em>
                    </>
                }
                description="Check-in tại venue, đi sự kiện, viết đánh giá — mỗi hoạt động đều tích điểm để đổi phần thưởng."
            />

            <div className="mt-6 rounded-xl border border-amber-border bg-amber-wash p-6 text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber">Điểm hiện có</p>
                <p className="font-display text-4xl font-extrabold text-amber">{mine.points}</p>
            </div>

            <section className="mt-10">
                <p className="mb-4 font-display text-lg font-extrabold">🎁 Đổi thưởng</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {rewards.items.map((reward) => (
                        <Card key={reward.id} className="flex flex-col gap-3 p-4">
                            <div>
                                <p className="font-display text-sm font-bold text-white">{reward.title}</p>
                                <p className="mt-1 text-xs text-muted">{reward.description}</p>
                            </div>
                            <p className="font-display text-lg font-extrabold text-amber">{reward.points} điểm</p>
                            <RedeemRewardButton reward={reward} redeemable={reward.redeemable} />
                        </Card>
                    ))}
                </div>
            </section>

            <section className="mt-10">
                <p className="mb-4 font-display text-lg font-extrabold">📜 Lịch sử điểm</p>
                {mine.history.items.length === 0 ? (
                    <EmptyState title="Chưa có hoạt động nào" description="Đặt bàn, đi sự kiện hoặc check-in để bắt đầu tích điểm." />
                ) : (
                    <>
                        <Card className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-void-3 text-left text-xs uppercase tracking-wide text-muted">
                                    <tr>
                                        <th className="whitespace-nowrap px-4 py-2.5 font-semibold">Hoạt động</th>
                                        <th className="whitespace-nowrap px-4 py-2.5 font-semibold">Mô tả</th>
                                        <th className="whitespace-nowrap px-4 py-2.5 font-semibold">Điểm</th>
                                        <th className="whitespace-nowrap px-4 py-2.5 font-semibold">Số dư</th>
                                        <th className="whitespace-nowrap px-4 py-2.5 font-semibold">Thời gian</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {mine.history.items.map((transaction) => (
                                        <tr key={transaction.id} className="border-t border-border">
                                            <td className="whitespace-nowrap px-4 py-2.5 text-white">
                                                {PASSPORT_SOURCE_LABEL[transaction.source_type] ?? transaction.source_type}
                                            </td>
                                            <td className="px-4 py-2.5 text-muted">{transaction.description ?? "—"}</td>
                                            <td className={["whitespace-nowrap px-4 py-2.5 font-semibold", transaction.points >= 0 ? "text-emerald-400" : "text-pink"].join(" ")}>
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
                        <Pagination pagination={mine.history.pagination} buildHref={buildHref} />
                    </>
                )}
            </section>
        </div>
    );
}
