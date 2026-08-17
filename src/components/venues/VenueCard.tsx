import Link from "next/link";
import type { Venue } from "@/lib/api/types";
import { Badge } from "@/components/ui/Badge";
import { formatVnd, VENUE_TYPE_EMOJI, VENUE_TYPE_LABEL } from "@/lib/format";

export function VenueCard({ venue }: { venue: Venue }) {
    return (
        <Link
            href={`/venues/${venue.slug}`}
            className="group block overflow-hidden rounded-xl border border-border bg-void-2 shadow-[0_4px_28px_rgba(0,0,0,.5)] transition-all hover:-translate-y-1 hover:border-amber-border hover:shadow-[0_12px_52px_rgba(0,0,0,.6)]"
        >
            <div className="relative flex h-40 items-center justify-center overflow-hidden bg-gradient-to-br from-void-3 to-void-4 text-5xl">
                {venue.media.thumbnail_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={venue.media.thumbnail_url} alt={venue.name} className="h-full w-full object-cover" />
                ) : (
                    <span>{VENUE_TYPE_EMOJI[venue.type] ?? "🥃"}</span>
                )}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-void/90 to-transparent" />
                <Badge tone="amber" className="absolute left-3 top-3">
                    {VENUE_TYPE_LABEL[venue.type] ?? venue.type}
                </Badge>
                {venue.status.is_verified && (
                    <Badge tone="green" className="absolute right-3 top-3">
                        ✓ Đã xác minh
                    </Badge>
                )}
            </div>
            <div className="p-4">
                <p className="mb-0.5 truncate font-display text-[17px] font-bold text-white transition-colors group-hover:text-amber">
                    {venue.name}
                </p>
                <p className="mb-2.5 truncate text-xs text-muted">
                    📍 {[venue.district, venue.city.toUpperCase()].filter(Boolean).join(" · ")}
                </p>
                {venue.features.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-1">
                        {venue.features.slice(0, 3).map((feature) => (
                            <span key={feature} className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-muted">
                                {feature}
                            </span>
                        ))}
                    </div>
                )}
                <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-[13px] text-amber">
                        ⭐ {venue.metrics.avg_rating ? venue.metrics.avg_rating.toFixed(1) : "Mới"}
                        <span className="text-[11px] text-muted">· {venue.metrics.total_reviews} đánh giá</span>
                    </span>
                    <span className="font-display text-sm font-bold text-white">
                        {venue.pricing.cover_charge > 0 ? formatVnd(venue.pricing.cover_charge) : "Free entry"}
                    </span>
                </div>
            </div>
        </Link>
    );
}
