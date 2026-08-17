import type { VenueDeal } from "@/lib/api/types";
import { Badge } from "@/components/ui/Badge";
import { dealDiscountLabel } from "@/lib/format";

const DAY_LABEL: Record<string, string> = {
    mon: "T2",
    tue: "T3",
    wed: "T4",
    thu: "T5",
    fri: "T6",
    sat: "T7",
    sun: "CN",
};

export function VenueDealsList({ deals }: { deals: VenueDeal[] }) {
    if (deals.length === 0) {
        return null;
    }

    return (
        <section>
            <p className="mb-3 font-display text-lg font-extrabold">⚡ Happy Hour deals</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {deals.map((deal) => (
                    <div key={deal.id} className="rounded-xl border border-border bg-void-2 p-4">
                        <div className="mb-2 flex items-start justify-between gap-2">
                            <p className="font-display text-sm font-bold text-white">{deal.title}</p>
                            {deal.is_exclusive && <Badge tone="amber">VIP</Badge>}
                        </div>
                        {deal.description && <p className="mb-2.5 text-xs leading-relaxed text-muted">{deal.description}</p>}
                        <div className="flex items-center justify-between">
                            <span className="text-[11.5px] font-semibold text-cyan">
                                ⏰ {deal.start_time}–{deal.end_time}
                                {deal.applicable_days.length > 0 && deal.applicable_days.length < 7 && (
                                    <> · {deal.applicable_days.map((day) => DAY_LABEL[day] ?? day).join(", ")}</>
                                )}
                            </span>
                            <span className="font-display text-base font-extrabold text-amber">{dealDiscountLabel(deal)}</span>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
