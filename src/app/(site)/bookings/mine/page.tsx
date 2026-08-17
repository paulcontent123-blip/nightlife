import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { serverFetch } from "@/lib/api/server";
import { ApiError } from "@/lib/api/envelope";
import type { Booking, Paginated } from "@/lib/api/types";
import { BookingCard } from "@/components/bookings/BookingCard";
import { Pagination } from "@/components/ui/Pagination";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/LinkButton";
import { RealtimeRefresh } from "@/components/realtime/RealtimeRefresh";

export const metadata: Metadata = { title: "Đặt bàn của tôi · Nightlife.vn" };

const STATUS_TABS: Array<{ value?: string; label: string }> = [
    { value: undefined, label: "Tất cả" },
    { value: "pending", label: "Chờ xác nhận" },
    { value: "confirmed", label: "Đã xác nhận" },
    { value: "completed", label: "Hoàn tất" },
    { value: "cancelled", label: "Đã huỷ" },
];

interface PageProps {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function MyBookingsPage({ searchParams }: PageProps) {
    const params = await searchParams;
    const status = typeof params.status === "string" ? params.status : undefined;
    const page = typeof params.page === "string" ? params.page : "1";

    const query = new URLSearchParams({ page, limit: "10" });

    if (status) {
        query.set("status", status);
    }

    let result: Paginated<Booking>;

    try {
        result = await serverFetch<Paginated<Booking>>(`/api/v1/bookings/mine?${query.toString()}`);
    } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
            redirect("/login?next=/bookings/mine");
        }

        throw error;
    }

    function buildHref(nextPage: number) {
        const next = new URLSearchParams(query);
        next.set("page", String(nextPage));

        return `/bookings/mine?${next.toString()}`;
    }

    return (
        <div className="mx-auto max-w-4xl px-5 py-16 sm:px-10">
            <RealtimeRefresh channelName="my-bookings" table="bookings" />
            <SectionHeading tag="Tài khoản của tôi" title="Đặt bàn của tôi" />

            <div className="mt-6 flex flex-wrap gap-2">
                {STATUS_TABS.map((tab) => {
                    const isActive = (status ?? undefined) === tab.value;
                    const href = tab.value ? `/bookings/mine?status=${tab.value}` : "/bookings/mine";

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
                <div className="mt-10">
                    <EmptyState
                        title="Chưa có đặt bàn nào"
                        description="Khám phá venues và đặt bàn cho tối nay."
                        action={<LinkButton href="/venues">Tìm địa điểm</LinkButton>}
                    />
                </div>
            ) : (
                <>
                    <div className="mt-6 flex flex-col gap-3">
                        {result.items.map((booking) => (
                            <BookingCard key={booking.id} booking={booking} />
                        ))}
                    </div>
                    <Pagination pagination={result.pagination} buildHref={buildHref} />
                </>
            )}
        </div>
    );
}
