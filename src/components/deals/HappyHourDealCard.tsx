import Link from "next/link";
import type { PublicDeal } from "@/lib/api/types";
import { Badge } from "@/components/ui/Badge";
import { dealDiscountLabel } from "@/lib/format";

const ACCENT_CLASSES = ["from-amber via-amber-2 to-amber-3", "from-pink via-pink to-pink/60", "from-cyan via-cyan to-cyan/60"];

export function HappyHourDealCard({ deal, index }: { deal: PublicDeal; index: number }) {
    const accent = ACCENT_CLASSES[index % ACCENT_CLASSES.length];

    return (
        <Link
            href={`/venues/${deal.venue.slug}`}
            prefetch={false}
            className="block overflow-hidden rounded-xl border border-border bg-void-2 transition-colors hover:border-amber-border"
        >
            <div className={["h-1 bg-gradient-to-r", accent].join(" ")} />
            <div className="p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-[10.5px] font-bold uppercase tracking-wide text-amber">{deal.venue.name}</p>
                    {deal.is_exclusive && <Badge tone="amber">VIP</Badge>}
                </div>
                <p className="mb-1 font-display text-base font-bold text-white">{deal.title}</p>
                {deal.description && <p className="mb-3 text-xs leading-relaxed text-muted">{deal.description}</p>}
                <div className="flex items-center justify-between">
                    <span className="text-[11.5px] font-semibold text-cyan">
                        🕐 {deal.start_time}–{deal.end_time}
                        {deal.is_open_now && <span className="ml-1.5 text-emerald-400">· Đang diễn ra</span>}
                    </span>
                    <span className="font-display text-lg font-extrabold text-amber">{dealDiscountLabel(deal)}</span>
                </div>
            </div>
        </Link>
    );
}
