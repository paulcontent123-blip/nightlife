import type { Metadata } from "next";
import { serverFetch } from "@/lib/api/server";
import type { BankTransferQueue, PaymentAccount } from "@/lib/api/types";
import { BankTransferActions } from "@/components/admin/BankTransferActions";
import { PaymentAccountManager } from "@/components/admin/PaymentAccountManager";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatVnd } from "@/lib/format";

export const metadata: Metadata = { title: "Chuyển khoản · Admin Nightlife.vn" };

const PURPOSE_LABEL: Record<string, string> = {
    booking: "Cọc đặt bàn",
    ticket_order: "Vé sự kiện",
    membership: "Membership",
};

export default async function AdminPaymentsPage() {
    const [queue, accounts] = await Promise.all([
        serverFetch<BankTransferQueue>("/api/v1/admin/bank-transfers"),
        serverFetch<{ items: PaymentAccount[] }>("/api/v1/admin/payment-accounts"),
    ]);

    return (
        <div className="flex flex-col gap-8">
            <div>
                <p className="mb-1 text-sm font-medium text-muted">Thanh toán</p>
                <h1 className="font-display text-2xl font-extrabold">Chuyển khoản QR</h1>
                <p className="mt-2 max-w-2xl text-sm text-muted">
                    Đối chiếu <strong className="text-white">số tiền</strong> và{" "}
                    <strong className="text-white">nội dung chuyển khoản</strong> trên sao kê ngân hàng với từng dòng bên
                    dưới. Chỉ bấm “Đã nhận tiền” khi tiền đã thực sự về tài khoản.
                </p>
            </div>

            <section className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                    <h2 className="font-display text-lg font-bold">Chờ đối soát</h2>
                    {queue.claimed_count > 0 && <Badge tone="amber">{queue.claimed_count} khách đã báo chuyển</Badge>}
                </div>

                {queue.items.length === 0 ? (
                    <EmptyState title="Không có giao dịch chờ đối soát" description="Các giao dịch chuyển khoản mới sẽ hiện ở đây." />
                ) : (
                    <Card className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-void-3 text-left text-xs uppercase tracking-wide text-muted">
                                <tr>
                                    <th className="whitespace-nowrap px-4 py-2.5 font-semibold">Nội dung CK</th>
                                    <th className="whitespace-nowrap px-4 py-2.5 font-semibold">Số tiền</th>
                                    <th className="whitespace-nowrap px-4 py-2.5 font-semibold">Loại</th>
                                    <th className="whitespace-nowrap px-4 py-2.5 font-semibold">Chi tiết</th>
                                    <th className="whitespace-nowrap px-4 py-2.5 font-semibold">Khách</th>
                                    <th className="whitespace-nowrap px-4 py-2.5 font-semibold">Khách báo</th>
                                    <th className="px-4 py-2.5" />
                                </tr>
                            </thead>
                            <tbody>
                                {queue.items.map((item) => (
                                    <tr key={`${item.purpose}-${item.id}`} className="border-t border-border">
                                        <td className="whitespace-nowrap px-4 py-2.5 font-mono text-[13px] text-amber">{item.payment_ref ?? "-"}</td>
                                        <td className="whitespace-nowrap px-4 py-2.5 font-semibold">{formatVnd(item.amount)}</td>
                                        <td className="whitespace-nowrap px-4 py-2.5">{PURPOSE_LABEL[item.purpose] ?? item.purpose}</td>
                                        <td className="min-w-48 px-4 py-2.5 text-muted">{item.description}</td>
                                        <td className="whitespace-nowrap px-4 py-2.5">
                                            <div>{item.user.display_name ?? "-"}</div>
                                            <div className="text-xs text-muted">{item.user.email ?? item.user.id.slice(0, 8)}</div>
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-2.5">
                                            {item.claimed_at ? (
                                                <Badge tone="amber">{new Date(item.claimed_at).toLocaleString("vi-VN")}</Badge>
                                            ) : (
                                                <span className="text-xs text-muted">Chưa báo</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-2.5 text-right">
                                            <BankTransferActions
                                                purpose={item.purpose}
                                                id={item.id}
                                                paymentRef={item.payment_ref}
                                                amountLabel={formatVnd(item.amount)}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </Card>
                )}
            </section>

            <section className="flex flex-col gap-3">
                <h2 className="font-display text-lg font-bold">Tài khoản nhận tiền</h2>
                <PaymentAccountManager accounts={accounts.items} />
            </section>
        </div>
    );
}
