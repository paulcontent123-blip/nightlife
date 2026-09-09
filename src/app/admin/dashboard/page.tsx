import Link from "next/link";
import type { Metadata } from "next";
import { serverFetch } from "@/lib/api/server";
import type { Booking, MembershipSubscription, Paginated, VenueListItem } from "@/lib/api/types";
import { Card } from "@/components/ui/Card";
import { BookingStatusBadge } from "@/components/bookings/BookingStatusBadge";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Dashboard · Admin Nightlife.vn" };

function todayIso() {
    return new Date().toISOString().slice(0, 10);
}

export default async function AdminDashboardPage() {
    const [venues, pendingBookings, todaysBookings, pendingMemberships] = await Promise.all([
        serverFetch<Paginated<VenueListItem>>("/api/v1/admin/venues?limit=1"),
        serverFetch<Paginated<Booking>>("/api/v1/admin/bookings?status=pending&limit=1"),
        serverFetch<Paginated<Booking>>(`/api/v1/admin/bookings?booking_date=${todayIso()}&limit=8`),
        serverFetch<Paginated<MembershipSubscription>>("/api/v1/admin/membership/subscriptions?status=payment_received&limit=1"),
    ]);

    const stats = [
        { label: "Tổng số venue", value: venues.pagination.total, href: "/admin/venues" },
        { label: "Đặt bàn chờ xác nhận", value: pendingBookings.pagination.total, href: "/admin/bookings?status=pending" },
        { label: "Đặt bàn hôm nay", value: todaysBookings.pagination.total, href: "/admin/bookings" },
        { label: "Membership chờ xác nhận", value: pendingMemberships.pagination.total, href: "/admin/membership?status=payment_received" },
    ];

    return (
        <div className="flex flex-col gap-8">
            <div>
                <p className="mb-1 text-sm font-medium text-muted">Tổng quan</p>
                <h1 className="font-display text-2xl font-extrabold">Dashboard</h1>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat) => (
                    <Link key={stat.label} href={stat.href}>
                        <Card className="p-5 transition-colors hover:border-amber-border">
                            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">{stat.label}</p>
                            <p className="font-display text-3xl font-extrabold text-amber">{stat.value}</p>
                        </Card>
                    </Link>
                ))}
            </div>

            <div>
                <div className="mb-3 flex items-center justify-between">
                    <p className="font-display text-lg font-extrabold">Đặt bàn hôm nay</p>
                    <Link href="/admin/bookings" className="text-sm font-semibold text-amber">
                        Xem tất cả →
                    </Link>
                </div>
                {todaysBookings.items.length === 0 ? (
                    <Card className="p-6 text-center text-sm text-muted">Chưa có đặt bàn nào cho hôm nay.</Card>
                ) : (
                    <Card className="overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-void-3 text-left text-xs uppercase tracking-wide text-muted">
                                <tr>
                                    <th className="px-4 py-2.5 font-semibold">Mã</th>
                                    <th className="px-4 py-2.5 font-semibold">Giờ</th>
                                    <th className="px-4 py-2.5 font-semibold">Khách</th>
                                    <th className="px-4 py-2.5 font-semibold">Trạng thái</th>
                                    <th className="px-4 py-2.5" />
                                </tr>
                            </thead>
                            <tbody>
                                {todaysBookings.items.map((booking) => (
                                    <tr key={booking.id} className="border-t border-border">
                                        <td className="px-4 py-2.5 font-mono text-xs text-muted">{booking.id.slice(0, 8)}</td>
                                        <td className="px-4 py-2.5">{booking.booking_time}</td>
                                        <td className="px-4 py-2.5">{booking.party_size}</td>
                                        <td className="px-4 py-2.5">
                                            <BookingStatusBadge status={booking.status} />
                                        </td>
                                        <td className="px-4 py-2.5 text-right">
                                            <Link href={`/admin/bookings/${booking.id}`} className="font-semibold text-amber">
                                                Xem →
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </Card>
                )}
            </div>

            <p className="text-xs text-muted">Hôm nay: {formatDate(todayIso())}</p>
        </div>
    );
}
