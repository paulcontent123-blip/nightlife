import Link from "next/link";
import type { Metadata } from "next";
import { serverFetch } from "@/lib/api/server";
import type { Paginated, VenueListItem } from "@/lib/api/types";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Pagination } from "@/components/ui/Pagination";
import { LinkButton } from "@/components/ui/LinkButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { CITY_LABEL, VENUE_TYPE_LABEL } from "@/lib/format";

export const metadata: Metadata = { title: "Venues · Admin Nightlife.vn" };

interface PageProps {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminVenuesPage({ searchParams }: PageProps) {
    const params = await searchParams;
    const city = typeof params.city === "string" ? params.city : undefined;
    const isActive = typeof params.is_active === "string" ? params.is_active : undefined;
    const page = typeof params.page === "string" ? params.page : "1";

    const query = new URLSearchParams({ page, limit: "20", sort: "newest" });

    if (city) query.set("city", city);
    if (isActive) query.set("is_active", isActive);

    const result = await serverFetch<Paginated<VenueListItem>>(`/api/v1/admin/venues?${query.toString()}`);

    function buildHref(nextPage: number) {
        const next = new URLSearchParams(query);
        next.set("page", String(nextPage));

        return `/admin/venues?${next.toString()}`;
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className="mb-1 text-sm font-medium text-muted">Quản lý</p>
                    <h1 className="font-display text-2xl font-extrabold">Venues</h1>
                </div>
                <LinkButton href="/admin/venues/new">+ Thêm venue</LinkButton>
            </div>

            <div className="flex flex-wrap gap-2">
                {[undefined, "hcm", "hanoi", "danang"].map((value) => {
                    const isActiveTab = city === value;
                    const href = value ? `/admin/venues?city=${value}` : "/admin/venues";

                    return (
                        <Link
                            key={value ?? "all"}
                            href={href}
                            className={[
                                "rounded-lg border-[1.5px] px-3.5 py-1.5 text-[13px] font-semibold transition-colors",
                                isActiveTab
                                    ? "border-amber-border bg-amber-wash text-amber"
                                    : "border-border-strong text-muted hover:border-amber-border hover:text-amber",
                            ].join(" ")}
                        >
                            {value ? CITY_LABEL[value] : "Tất cả thành phố"}
                        </Link>
                    );
                })}
            </div>

            {result.items.length === 0 ? (
                <EmptyState title="Chưa có venue nào" action={<LinkButton href="/admin/venues/new">+ Thêm venue đầu tiên</LinkButton>} />
            ) : (
                <>
                    <Card className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-void-3 text-left text-xs uppercase tracking-wide text-muted">
                                <tr>
                                    <th className="whitespace-nowrap px-4 py-2.5 font-semibold">Tên</th>
                                    <th className="whitespace-nowrap px-4 py-2.5 font-semibold">Loại</th>
                                    <th className="whitespace-nowrap px-4 py-2.5 font-semibold">Khu vực</th>
                                    <th className="whitespace-nowrap px-4 py-2.5 font-semibold">Trạng thái</th>
                                    <th className="whitespace-nowrap px-4 py-2.5 font-semibold">Đánh giá</th>
                                    <th className="px-4 py-2.5" />
                                </tr>
                            </thead>
                            <tbody>
                                {result.items.map((venue) => (
                                    <tr key={venue.id} className="border-t border-border">
                                        <td className="whitespace-nowrap px-4 py-2.5 font-semibold text-white">{venue.name}</td>
                                        <td className="whitespace-nowrap px-4 py-2.5 text-muted">{VENUE_TYPE_LABEL[venue.type] ?? venue.type}</td>
                                        <td className="whitespace-nowrap px-4 py-2.5 text-muted">
                                            {[venue.district, CITY_LABEL[venue.city] ?? venue.city].filter(Boolean).join(" · ")}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-2.5">
                                            <div className="flex gap-1.5">
                                                <Badge tone={venue.status.is_active ? "green" : "gray"}>
                                                    {venue.status.is_active ? "Active" : "Inactive"}
                                                </Badge>
                                                {venue.status.is_verified && <Badge tone="amber">Verified</Badge>}
                                            </div>
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-2.5 text-muted">
                                            {venue.metrics.avg_rating ? `⭐ ${venue.metrics.avg_rating.toFixed(1)}` : "—"}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-2.5 text-right">
                                            <Link href={`/admin/venues/${venue.id}`} className="font-semibold text-amber">
                                                Sửa →
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
