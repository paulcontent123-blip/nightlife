import Link from "next/link";
import type { Booking } from "@/lib/api/types";
import { BookingStatusBadge } from "./BookingStatusBadge";
import { CancelBookingButton } from "./CancelBookingButton";
import { formatDate, formatVnd } from "@/lib/format";

const CANCELLABLE: Booking["status"][] = ["pending", "confirmed"];

export function BookingCard({ booking }: { booking: Booking }) {
    return (
        <div className="rounded-xl border border-border bg-void-2 p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
                <BookingStatusBadge status={booking.status} />
                <span className="font-mono text-[11px] text-muted">#{booking.id.slice(0, 8)}</span>
            </div>
            <p className="text-sm text-white">
                {formatDate(booking.booking_date)} · {booking.booking_time} · {booking.party_size} khách
            </p>
            {booking.deposit.amount > 0 && (
                <p className="mt-1 text-xs text-muted">
                    Đặt cọc: {formatVnd(booking.deposit.amount)} · {booking.deposit.paid ? "Đã thanh toán" : "Chưa thanh toán"}
                </p>
            )}
            {booking.special_requests && <p className="mt-1 truncate text-xs text-muted">Ghi chú: {booking.special_requests}</p>}
            <div className="mt-3 flex items-center gap-4">
                <Link href={`/bookings/${booking.id}`} className="font-display text-sm font-bold text-amber">
                    Xem chi tiết →
                </Link>
                {CANCELLABLE.includes(booking.status) && <CancelBookingButton bookingId={booking.id} />}
            </div>
        </div>
    );
}
