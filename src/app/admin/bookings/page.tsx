import Link from "next/link";
import type { Metadata } from "next";
import { serverFetch } from "@/lib/api/server";
import type { Booking, Paginated } from "@/lib/api/types";
import { BookingStatusBadge } from "@/components/bookings/BookingStatusBadge";
import { Pagination } from "@/components/ui/Pagination";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { RealtimeRefresh } from "@/components/realtime/RealtimeRefresh";
import { formatDate, formatVnd } from "@/lib/format";

export const metadata: Metadata = { title: "Đặt bàn · Admin Nightlife.vn" };

const STATUS_TABS: Array<{ value?: string; label: string }> = [
    { value: undefined, label: "Tất cả" },
    { value: "pending", label: "Chờ xác nhận" },
    { value: "confirmed", label: "Đã xác nhận" },
    { value: "seated", label: "Đã nhận bàn" },
    { value: "completed", label: "Hoàn tất" },
    { value: "cancelled", label: "Đã huỷ" },
];

interface PageProps {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminBookingsPage({ searchParams }: PageProps) {
    const params = await searchParams;
    const status = typeof params.status === "string" ? params.status : undefined;
    const bookingDate = typeof params.booking_date === "string" ? params.booking_date : undefined;
    const page = typeof params.page === "string" ? params.page : "1";

    const query = new URLSearchParams({ page, limit: "20" });

    if (status) query.set("status", status);
    if (bookingDate) query.set("booking_date", bookingDate);

    const result = await serverFetch<Paginated<Booking>>(`/api/v1/admin/bookings?${query.toString()}`);

    function buildHref(nextPage: number) {
        const next = new URLSearchParams(query);
        next.set("page", String(nextPage));

        return `/admin/bookings?${next.toString()}`;
    }

    return (
        <div className="flex flex-col gap-6">
            <RealtimeRefresh channelName="admin-bookings" table="bookings" />
            <div>
                <p className="mb-1 text-sm font-medium text-muted">Quản lý</p>
                <h1 className="font-display text-2xl font-extrabold">Đặt bàn</h1>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                    {STATUS_TABS.map((tab) => {
                        const isActive = status === tab.value;
                        const href = tab.value
                            ? `/admin/bookings?status=${tab.value}${bookingDate ? `&booking_date=${bookingDate}` : ""}`
                            : `/admin/bookings${bookingDate ? `?booking_date=${bookingDate}` : ""}`;

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
                <form method="get" className="flex items-center gap-2">
                    {status && <input type="hidden" name="status" value={status} />}
                    <input
                        type="date"
                        name="booking_date"
                        defaultValue={bookingDate}
                        className="h-9 rounded-lg border-[1.5px] border-border-strong bg-void-3 px-2.5 text-xs text-white outline-none focus:border-amber"
                    />
                    <button type="submit" className="rounded-lg border-[1.5px] border-border-strong px-3 py-1.5 text-xs font-semibold text-muted hover:border-amber-border hover:text-amber">
                        Lọc
                    </button>
                    {bookingDate && (
                        <Link href={status ? `/admin/bookings?status=${status}` : "/admin/bookings"} className="text-xs text-muted hover:text-white">
                            Xoá
                        </Link>
                    )}
                </form>
            </div>

            {result.items.length === 0 ? (
                <EmptyState title="Không có đặt bàn nào" description="Thử thay đổi bộ lọc." />
            ) : (
                <>
                    <Card className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-void-3 text-left text-xs uppercase tracking-wide text-muted">
                                <tr>
                                    <th className="whitespace-nowrap px-4 py-2.5 font-semibold">Mã</th>
                                    <th className="whitespace-nowrap px-4 py-2.5 font-semibold">Ngày giờ</th>
                                    <th className="whitespace-nowrap px-4 py-2.5 font-semibold">Khách</th>
                                    <th className="whitespace-nowrap px-4 py-2.5 font-semibold">Cọc</th>
                                    <th className="whitespace-nowrap px-4 py-2.5 font-semibold">Trạng thái</th>
                                    <th className="whitespace-nowrap px-4 py-2.5 font-semibold">Venue</th>
                                    <th className="px-4 py-2.5" />
                                </tr>
                            </thead>
                            <tbody>
                                {result.items.map((booking) => (
                                    <tr key={booking.id} className="border-t border-border">
                                        <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-muted">{booking.id.slice(0, 8)}</td>
                                        <td className="whitespace-nowrap px-4 py-2.5">
                                            {formatDate(booking.booking_date)} · {booking.booking_time}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-2.5">{booking.party_size}</td>
                                        <td className="whitespace-nowrap px-4 py-2.5 text-xs">
                                            {booking.deposit.amount > 0 ? (
                                                <span className={booking.deposit.paid ? "text-emerald-400" : "text-amber"}>
                                                    {formatVnd(booking.deposit.amount)} {booking.deposit.paid ? "✓" : "chưa TT"}
                                                </span>
                                            ) : (
                                                <span className="text-muted">Không cọc</span>
                                            )}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-2.5">
                                            <BookingStatusBadge status={booking.status} />
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-2.5">
                                            <Link href={`/admin/venues/${booking.venue_id}`} className="font-mono text-xs text-muted hover:text-amber">
                                                {booking.venue_id.slice(0, 8)}
                                            </Link>
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-2.5 text-right">
                                            <Link href={`/admin/bookings/${booking.id}`} className="font-semibold text-amber">
                                                Chi tiết →
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
