import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { serverFetch } from "@/lib/api/server";
import { ApiError } from "@/lib/api/envelope";
import type { VenueDetail } from "@/lib/api/types";
import { Badge } from "@/components/ui/Badge";
import { BookingWidget } from "@/components/venues/BookingWidget";
import { VenueDealsList } from "@/components/venues/VenueDealsList";
import { VenueReviewsList } from "@/components/venues/VenueReviewsList";
import { VenueUpcomingEvents } from "@/components/venues/VenueUpcomingEvents";
import { VenueForumDiscussion } from "@/components/venues/VenueForumDiscussion";
import { WriteVenueReviewSection } from "@/components/venues/WriteVenueReviewSection";
import { formatVnd, VENUE_TYPE_EMOJI, VENUE_TYPE_LABEL } from "@/lib/format";

interface VenuePageProps {
    params: Promise<{ slug: string }>;
}

async function getVenue(slug: string): Promise<VenueDetail | null> {
    try {
        return await serverFetch<VenueDetail>(`/api/v1/venues/${slug}`);
    } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
            return null;
        }

        throw error;
    }
}

export async function generateMetadata({ params }: VenuePageProps): Promise<Metadata> {
    const { slug } = await params;
    const venue = await getVenue(slug);

    if (!venue) {
        return { title: "Venue không tồn tại · Nightlife.vn" };
    }

    return { title: `${venue.name} · Nightlife.vn` };
}

export default async function VenueDetailPage({ params }: VenuePageProps) {
    const { slug } = await params;
    const venue = await getVenue(slug);

    if (!venue) {
        notFound();
    }

    const openHoursEntries = venue.operations.open_hours ? Object.entries(venue.operations.open_hours) : [];

    return (
        <div>
            <div className="relative flex h-64 items-center justify-center overflow-hidden border-b border-border bg-gradient-to-br from-void-3 to-void-4 text-7xl sm:h-80">
                {venue.media.thumbnail_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={venue.media.thumbnail_url} alt={venue.name} className="h-full w-full object-cover" />
                ) : (
                    <span>{VENUE_TYPE_EMOJI[venue.type] ?? "🥃"}</span>
                )}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-void via-void/50 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-6xl px-5 pb-6 sm:px-10">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                        <Badge tone="amber">{VENUE_TYPE_LABEL[venue.type] ?? venue.type}</Badge>
                        {venue.status.is_verified && <Badge tone="green">✓ Đã xác minh</Badge>}
                        {venue.operations.is_vip_only && <Badge tone="pink">VIP Only</Badge>}
                    </div>
                    <h1 className="font-display text-3xl font-extrabold sm:text-4xl">{venue.name}</h1>
                    <p className="mt-1 text-sm text-muted">
                        📍 {venue.address}
                        {venue.district ? ` · ${venue.district}` : ""}
                    </p>
                </div>
            </div>

            <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-5 py-10 sm:px-10 lg:grid-cols-[1fr_360px]">
                <div className="flex flex-col gap-8">
                    <div className="flex flex-wrap items-center gap-5 rounded-xl border border-border bg-void-2 p-4 text-sm">
                        <span className="flex items-center gap-1.5 text-amber">
                            ⭐ {venue.metrics.avg_rating ? venue.metrics.avg_rating.toFixed(1) : "Mới"}
                            <span className="text-muted">({venue.metrics.total_reviews} đánh giá)</span>
                        </span>
                        <span className="text-white">{venue.pricing.price_range}</span>
                        <span className="text-muted">
                            {venue.pricing.cover_charge > 0 ? `Cover: ${formatVnd(venue.pricing.cover_charge)}` : "Miễn phí vào cửa"}
                        </span>
                        {venue.pricing.min_spend ? (
                            <span className="text-muted">Chi tiêu tối thiểu: {formatVnd(venue.pricing.min_spend)}</span>
                        ) : null}
                        <span className="text-muted">{venue.pricing.age_restriction}+</span>
                    </div>

                    {venue.description && (
                        <section>
                            <p className="mb-2 font-display text-lg font-extrabold">Giới thiệu</p>
                            <p className="whitespace-pre-line text-sm leading-relaxed text-muted">{venue.description}</p>
                        </section>
                    )}

                    {venue.features.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                            {venue.features.map((feature) => (
                                <span key={feature} className="rounded-md bg-white/5 px-2.5 py-1 text-xs font-semibold text-muted">
                                    {feature}
                                </span>
                            ))}
                        </div>
                    )}

                    <VenueUpcomingEvents slug={venue.slug} />

                    <VenueDealsList deals={venue.deals} />

                    <section>
                        <p className="mb-3 font-display text-lg font-extrabold">🪑 Bàn / khu vực</p>
                        {venue.tables.length === 0 ? (
                            <p className="text-sm text-muted">Venue chưa cập nhật thông tin bàn.</p>
                        ) : (
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                {venue.tables.map((table) => (
                                    <div key={table.id} className="flex items-center justify-between rounded-lg border border-border bg-void-2 px-3.5 py-2.5 text-sm">
                                        <span>
                                            <span className="font-semibold text-white">{table.table_name}</span>
                                            <span className="ml-1.5 text-xs text-muted">· {table.capacity} khách</span>
                                        </span>
                                        <span className="text-xs text-muted">
                                            {table.deposit_required > 0 ? `Cọc ${formatVnd(table.deposit_required)}` : "Không cọc"}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    {openHoursEntries.length > 0 && (
                        <section>
                            <p className="mb-3 font-display text-lg font-extrabold">🕐 Giờ mở cửa</p>
                            <div className="grid grid-cols-2 gap-1.5 text-sm sm:grid-cols-4">
                                {openHoursEntries.map(([day, hours]) => (
                                    <div key={day} className="rounded-lg border border-border bg-void-2 px-3 py-2">
                                        <p className="text-[11px] font-bold uppercase text-muted">{day}</p>
                                        <p className="text-white">{hours}</p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    <VenueReviewsList reviews={venue.reviews} />

                    <WriteVenueReviewSection slug={venue.slug} />

                    <VenueForumDiscussion venueId={venue.id} venueName={venue.name} />
                </div>

                <div>
                    <BookingWidget slug={venue.slug} venueId={venue.id} />
                </div>
            </div>
        </div>
    );
}
