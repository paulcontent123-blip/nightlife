import Link from "next/link";

type StatusTone = "pink" | "cyan" | "amber";

interface HotTonightItem {
    icon: string;
    name: string;
    meta: string;
    status: string;
    statusTone: StatusTone;
    price: string;
}

// Static illustrative content — not wired to live venue data yet.
const HOT_TONIGHT: HotTonightItem[] = [
    { icon: "🥃", name: "Observatory Saigon", meta: "Rooftop Bar · Q1 · ⭐ 4.9", status: "Còn bàn", statusTone: "pink", price: "Cover: 200k" },
    { icon: "🎵", name: "Lush Nightclub", meta: "Club · Q1 · ⭐ 4.8", status: "Đông", statusTone: "pink", price: "Cover: 300k" },
    { icon: "🎭", name: "Envy Club", meta: "Club · Q1 · ⭐ 4.7", status: "VIP avail", statusTone: "cyan", price: "Table: 2tr+" },
    { icon: "🌿", name: "The Deck Saigon", meta: "Riverside · Q2 · ⭐ 4.9", status: "Happy hr", statusTone: "amber", price: "–50% drink" },
];

const STATUS_TONE_CLASSES: Record<StatusTone, string> = {
    pink: "border-pink/20 bg-pink-wash text-pink",
    cyan: "border-cyan/20 bg-cyan-wash text-cyan",
    amber: "border-amber-border bg-amber-wash text-amber",
};

const DOT_TONE_CLASSES: Record<StatusTone, string> = {
    pink: "bg-pink",
    cyan: "bg-cyan",
    amber: "bg-amber",
};

export function HeroHotTonightPanel() {
    return (
        <div className="hidden h-full flex-col justify-center gap-2.5 border-l border-border bg-void-2 px-6 py-10 lg:flex">
            <p className="mb-1 font-display text-[11px] font-bold uppercase tracking-[1.5px] text-muted">
                Đang hot tối nay ● LIVE
            </p>

            {HOT_TONIGHT.map((item) => (
                <div
                    key={item.name}
                    className="flex items-center gap-3 rounded-xl border border-border bg-void-3 p-3.5 transition-all hover:border-amber-border hover:-translate-x-1"
                >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-void-4 to-void-5 text-xl">
                        {item.icon}
                    </span>
                    <div className="min-w-0">
                        <p className="truncate font-display text-sm font-bold text-white">{item.name}</p>
                        <p className="truncate text-[11.5px] text-muted">{item.meta}</p>
                    </div>
                    <div className="ml-auto shrink-0 text-right">
                        <span
                            className={[
                                "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-bold",
                                STATUS_TONE_CLASSES[item.statusTone],
                            ].join(" ")}
                        >
                            {item.statusTone !== "amber" && (
                                <span className={["h-1.5 w-1.5 animate-pulse rounded-full", DOT_TONE_CLASSES[item.statusTone]].join(" ")} />
                            )}
                            {item.status}
                        </span>
                        <p className="mt-1 text-xs font-semibold text-amber">{item.price}</p>
                    </div>
                </div>
            ))}

            <Link
                href="/happy-hour"
                className="mt-1 block rounded-xl border border-amber-border bg-amber-wash px-4 py-3.5 text-center text-sm font-semibold text-amber transition-colors hover:bg-amber hover:text-void"
            >
                ⚡ 14 Happy Hour deals đang active tối nay →
            </Link>
        </div>
    );
}
