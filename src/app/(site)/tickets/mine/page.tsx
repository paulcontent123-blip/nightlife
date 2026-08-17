import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { serverFetch } from "@/lib/api/server";
import { ApiError } from "@/lib/api/envelope";
import type { Paginated, Ticket } from "@/lib/api/types";
import { TicketCard } from "@/components/tickets/TicketCard";
import { Pagination } from "@/components/ui/Pagination";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { EmptyState } from "@/components/ui/EmptyState";
import { Alert } from "@/components/ui/Alert";
import { LinkButton } from "@/components/ui/LinkButton";
import { RealtimeRefresh } from "@/components/realtime/RealtimeRefresh";

export const metadata: Metadata = { title: "Vé của tôi · Nightlife.vn" };

interface PageProps {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function MyTicketsPage({ searchParams }: PageProps) {
    const params = await searchParams;
    const page = typeof params.page === "string" ? params.page : "1";
    const orderId = typeof params.order === "string" ? params.order : undefined;
    const paymentResult = typeof params.payment === "string" ? params.payment : undefined;

    let result: Paginated<Ticket>;

    try {
        result = await serverFetch<Paginated<Ticket>>(`/api/v1/tickets/mine?page=${page}&limit=10`);
    } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
            redirect("/login?next=/tickets/mine");
        }

        throw error;
    }

    function buildHref(nextPage: number) {
        return `/tickets/mine?page=${nextPage}`;
    }

    return (
        <div className="mx-auto max-w-4xl px-5 py-16 sm:px-10">
            <RealtimeRefresh channelName="tickets-mine" table="tickets" />
            <SectionHeading tag="Tài khoản của tôi" title="Vé của tôi" />

            {paymentResult === "success" && orderId && (
                <div className="mt-6">
                    <Alert tone="success">
                        Thanh toán mô phỏng thành công. Đơn vé <span className="font-mono">#{orderId.slice(0, 8)}</span> đang chờ admin xác nhận
                        — vé thật sẽ xuất hiện ở đây sau khi được duyệt.
                    </Alert>
                </div>
            )}
            {paymentResult === "failed" && (
                <div className="mt-6">
                    <Alert>Giao dịch mô phỏng thất bại. Không có đơn vé nào được tạo, vui lòng thử mua lại.</Alert>
                </div>
            )}

            {result.items.length === 0 ? (
                <div className="mt-10">
                    <EmptyState
                        title="Bạn chưa có vé nào"
                        description="Khám phá các sự kiện sắp diễn ra và đừng bỏ lỡ."
                        action={<LinkButton href="/events">Xem sự kiện</LinkButton>}
                    />
                </div>
            ) : (
                <>
                    <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {result.items.map((ticket) => (
                            <TicketCard key={ticket.id} ticket={ticket} />
                        ))}
                    </div>
                    <Pagination pagination={result.pagination} buildHref={buildHref} />
                </>
            )}
        </div>
    );
}
