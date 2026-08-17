import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { serverFetch } from "@/lib/api/server";
import { ApiError } from "@/lib/api/envelope";
import type { Booking } from "@/lib/api/types";
import { BookingStatusBadge } from "@/components/bookings/BookingStatusBadge";
import { BookingActionButtons } from "@/components/admin/BookingActionButtons";
import { Card } from "@/components/ui/Card";
import { RealtimeRefresh } from "@/components/realtime/RealtimeRefresh";
import { formatDate, formatVnd } from "@/lib/format";

export const metadata: Metadata = { title: "Chi tiết đặt bàn · Admin Nightlife.vn" };

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function AdminBookingDetailPage({ params }: PageProps) {
    const { id } = await params;

    let booking: Booking;

    try {
        booking = await serverFetch<Booking>(`/api/v1/admin/bookings/${id}`);
    } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
            notFound();
        }

        throw error;
    }

    return (
        <div className="flex max-w-2xl flex-col gap-6">
            <RealtimeRefresh
                channelName={`admin-booking-${booking.id}`}
                table="bookings"
                filter={`id=eq.${booking.id}`}
            />
            <div>
                <Link href="/admin/bookings" className="mb-3 inline-block text-sm text-muted hover:text-white">
                    ← Đặt bàn
                </Link>
                <div className="flex items-center gap-3">
                    <h1 className="font-display text-2xl font-extrabold">Đặt bàn #{booking.id.slice(0, 8)}</h1>
                    <BookingStatusBadge status={booking.status} />
                </div>
            </div>

            <Card className="p-5">
                <div className="flex flex-col gap-2 text-sm">
                    <Row label="Mã đặt bàn" value={booking.id} mono />
                    <Row label="Venue" value={booking.venue_id} mono link={`/admin/venues/${booking.venue_id}`} />
                    <Row label="Bàn" value={booking.table_id ?? "—"} mono />
                    <Row label="Khách hàng (user_id)" value={booking.user_id} mono />
                    <Row label="Ngày giờ" value={`${formatDate(booking.booking_date)} · ${booking.booking_time}`} />
                    <Row label="Số khách" value={String(booking.party_size)} />
                    {booking.special_requests && <Row label="Ghi chú" value={booking.special_requests} />}
                    <Row
                        label="Đặt cọc"
                        value={
                            booking.deposit.amount > 0
                                ? `${formatVnd(booking.deposit.amount)} · ${booking.deposit.paid ? "Đã thanh toán" : "Chưa thanh toán"}`
                                : "Không yêu cầu cọc"
                        }
                    />
                    {booking.payment_ref && <Row label="Mã giao dịch" value={booking.payment_ref} mono />}
                    {booking.payment_method && <Row label="Hình thức TT" value={booking.payment_method} />}
                    <Row label="Tạo lúc" value={new Date(booking.created_at).toLocaleString("vi-VN")} />
                    {booking.confirmed_at && <Row label="Xác nhận lúc" value={new Date(booking.confirmed_at).toLocaleString("vi-VN")} />}
                    {booking.cancelled_at && <Row label="Huỷ lúc" value={new Date(booking.cancelled_at).toLocaleString("vi-VN")} />}
                </div>
            </Card>

            <Card className="p-5">
                <p className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-muted">Thao tác</p>
                <BookingActionButtons booking={booking} />
            </Card>
        </div>
    );
}

function Row({ label, value, mono, link }: { label: string; value: string; mono?: boolean; link?: string }) {
    const content = <span className={["truncate", mono ? "font-mono text-xs" : ""].join(" ")}>{value}</span>;

    return (
        <div className="flex items-center justify-between gap-3">
            <span className="text-muted">{label}</span>
            {link ? (
                <Link href={link} className="text-amber hover:underline">
                    {content}
                </Link>
            ) : (
                <span className="text-right text-white">{content}</span>
            )}
        </div>
    );
}
