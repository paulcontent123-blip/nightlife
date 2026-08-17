import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { serverFetch } from "@/lib/api/server";
import { ApiError } from "@/lib/api/envelope";
import type { Booking } from "@/lib/api/types";
import { BookingStatusBadge } from "@/components/bookings/BookingStatusBadge";
import { CancelBookingButton } from "@/components/bookings/CancelBookingButton";
import { Alert } from "@/components/ui/Alert";
import { RealtimeRefresh } from "@/components/realtime/RealtimeRefresh";
import { formatDate, formatVnd } from "@/lib/format";

export const metadata: Metadata = { title: "Chi tiết đặt bàn · Nightlife.vn" };

interface PageProps {
    params: Promise<{ id: string }>;
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const CANCELLABLE: Booking["status"][] = ["pending", "confirmed"];

function statusMessage(booking: Booking) {
    if (booking.status === "confirmed") {
        return { tone: "success" as const, text: "Đặt bàn đã được xác nhận. Hẹn gặp bạn tối nay!" };
    }

    if (booking.status === "seated") {
        return { tone: "success" as const, text: "Bạn đã check-in tại venue." };
    }

    if (booking.status === "completed") {
        return { tone: "info" as const, text: "Buổi đi chơi đã hoàn tất. Cảm ơn bạn đã sử dụng Nightlife.vn!" };
    }

    if (booking.status === "cancelled") {
        return { tone: "error" as const, text: "Đặt bàn này đã bị huỷ." };
    }

    if (booking.status === "no_show") {
        return { tone: "error" as const, text: "Đặt bàn được ghi nhận là không đến." };
    }

    if (booking.deposit.amount > 0 && !booking.deposit.paid) {
        return { tone: "info" as const, text: "Đặt bàn đang chờ thanh toán đặt cọc." };
    }

    return { tone: "info" as const, text: "Đặt bàn đang chờ venue xác nhận. Chúng tôi sẽ thông báo ngay khi có cập nhật." };
}

export default async function BookingDetailPage({ params, searchParams }: PageProps) {
    const { id } = await params;
    const query = await searchParams;
    const paymentResult = typeof query.payment === "string" ? query.payment : null;

    let booking: Booking;

    try {
        booking = await serverFetch<Booking>(`/api/v1/bookings/${id}`);
    } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
            redirect(`/login?next=/bookings/${id}`);
        }

        if (error instanceof ApiError && (error.status === 404 || error.status === 403)) {
            notFound();
        }

        throw error;
    }

    const message = statusMessage(booking);

    return (
        <div className="mx-auto max-w-2xl px-5 py-16 sm:px-10">
            <RealtimeRefresh
                channelName={`booking-${booking.id}`}
                table="bookings"
                filter={`id=eq.${booking.id}`}
            />
            <Link href="/bookings/mine" className="mb-6 inline-block text-sm text-muted hover:text-white">
                ← Đặt bàn của tôi
            </Link>

            {paymentResult === "success" && (
                <div className="mb-4">
                    <Alert tone="success">Thanh toán mô phỏng thành công. Đặt bàn đang chờ venue xác nhận.</Alert>
                </div>
            )}
            {paymentResult === "failed" && (
                <div className="mb-4">
                    <Alert>Giao dịch mô phỏng thất bại. Đặt bàn vẫn ở trạng thái chờ thanh toán.</Alert>
                </div>
            )}

            <div className="rounded-2xl border border-border bg-void-2 p-6 shadow-[0_12px_52px_rgba(0,0,0,.6)]">
                <div className="mb-4 flex items-center justify-between">
                    <BookingStatusBadge status={booking.status} />
                    <span className="font-mono text-xs text-muted">#{booking.id}</span>
                </div>

                <p className="font-display text-2xl font-extrabold">
                    {formatDate(booking.booking_date)} · {booking.booking_time}
                </p>
                <p className="mt-1 text-sm text-muted">{booking.party_size} khách</p>

                <div className="my-5 h-px bg-border" />

                <div className="flex flex-col gap-2 text-sm">
                    {booking.special_requests && (
                        <Row label="Ghi chú" value={booking.special_requests} />
                    )}
                    {booking.deposit.amount > 0 && (
                        <>
                            <Row label="Tiền đặt cọc" value={formatVnd(booking.deposit.amount)} />
                            <Row label="Trạng thái cọc" value={booking.deposit.paid ? "Đã thanh toán" : "Chưa thanh toán"} />
                        </>
                    )}
                    {booking.payment_method && <Row label="Hình thức thanh toán" value={booking.payment_method} />}
                    <Row label="Ngày tạo" value={new Date(booking.created_at).toLocaleString("vi-VN")} />
                </div>

                <div className="my-5 h-px bg-border" />

                <Alert tone={message.tone}>{message.text}</Alert>

                {CANCELLABLE.includes(booking.status) && (
                    <div className="mt-5">
                        <CancelBookingButton bookingId={booking.id} />
                    </div>
                )}
            </div>
        </div>
    );
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between gap-3">
            <span className="text-muted">{label}</span>
            <span className="text-right text-white">{value}</span>
        </div>
    );
}
