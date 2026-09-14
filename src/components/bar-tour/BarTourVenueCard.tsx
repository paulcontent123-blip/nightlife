import Link from "next/link";
import type { BarTourVenueSuggestion } from "@/lib/api/types";
import { Badge } from "@/components/ui/Badge";
import { VENUE_TYPE_EMOJI, VENUE_TYPE_LABEL } from "@/lib/format";

export function BarTourVenueCard({
    suggestion,
    newLabel,
    reviewsLabel,
}: {
    suggestion: BarTourVenueSuggestion;
    newLabel: string;
    reviewsLabel: string;
}) {
    return (
        <Link
            href={`/venues/${suggestion.slug}`}
            prefetch={false}
            className="block min-w-0 overflow-hidden rounded-xl border border-border bg-void-2 p-4 transition-colors hover:border-amber-border hover:bg-void-3"
        >
            <div className="mb-2 flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="break-words font-display text-base font-bold text-white">
                        {VENUE_TYPE_EMOJI[suggestion.type] ?? String.fromCodePoint(0x1F943)} {suggestion.name}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                        &#x1F4CD; {[suggestion.district, suggestion.city.toUpperCase()].filter(Boolean).join(" · ")} ·{" "}
                        {VENUE_TYPE_LABEL[suggestion.type] ?? suggestion.type}
                    </p>
                </div>
                <Badge tone="amber">Score {suggestion.score}</Badge>
            </div>

            <p className="mb-2.5 text-xs leading-relaxed text-muted">{suggestion.reason}</p>

            <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-amber">&#x2B50; {suggestion.rating ? suggestion.rating.toFixed(1) : newLabel}</span>
                <span className="text-muted">· {suggestion.total_reviews} {reviewsLabel}</span>
                <span className="text-white">{suggestion.price_range}</span>
            </div>

            {(suggestion.deals.length > 0 || suggestion.events.length > 0) && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {suggestion.deals.map((deal) => (
                        <span key={deal.id} className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                            &#x1F3F7;&#xFE0F; {deal.title}
                        </span>
                    ))}
                    {suggestion.events.map((event) => (
                        <span key={event.id} className="rounded-md bg-cyan-wash px-2 py-0.5 text-[10px] font-semibold text-cyan">
                            &#x1F39F;&#xFE0F; {event.title}
                        </span>
                    ))}
                </div>
            )}
        </Link>
    );
}
