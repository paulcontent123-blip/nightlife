import { LinkButton } from "@/components/ui/LinkButton";
import { HeroHotTonightPanel } from "@/components/home/HeroHotTonightPanel";

const HERO_STATS = [
    { value: "2.800+", label: "Venues xác minh" },
    { value: "48K+", label: "Đặt bàn/tháng" },
    { value: "120+", label: "Events/tháng" },
    { value: "8 TP", label: "Thành phố" },
];

export default function HomePage() {
    return (
        <section className="relative overflow-hidden">
            <div
                className="pointer-events-none absolute inset-0 opacity-40"
                style={{
                    backgroundImage:
                        "linear-gradient(rgba(240,160,48,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(240,160,48,.05) 1px, transparent 1px)",
                    backgroundSize: "56px 56px",
                }}
            />
            <div
                className="pointer-events-none absolute -left-32 -top-32 h-[500px] w-[500px] rounded-full opacity-70"
                style={{ background: "radial-gradient(circle, rgba(240,160,48,.14) 0%, transparent 65%)" }}
            />
            <div
                className="pointer-events-none absolute -right-20 bottom-0 h-[380px] w-[380px] rounded-full opacity-70"
                style={{ background: "radial-gradient(circle, rgba(224,64,106,.09) 0%, transparent 65%)" }}
            />

            <div className="relative grid grid-cols-1 lg:grid-cols-[1fr_420px]">
                <div className="px-5 py-20 sm:px-10 sm:py-28">
                    <div className="max-w-3xl">
                        <p className="mb-5 flex items-center gap-2 font-display text-[11px] font-bold uppercase tracking-[2px] text-amber">
                            <span className="h-px w-5 bg-amber" />
                            Vietnam&apos;s #1 Nightlife Platform
                        </p>
                        <h1 className="mb-4 font-display text-5xl font-extrabold leading-[1] tracking-tight sm:text-6xl">
                            Đêm nay <span className="bg-gradient-to-br from-amber via-amber-2 to-amber-3 bg-clip-text text-transparent">đi đâu?</span>
                            <br />
                            <span className="font-normal text-muted">— Chúng tôi biết.</span>
                        </h1>
                        <p className="mb-8 max-w-lg text-base leading-relaxed text-muted">
                            Khám phá hàng trăm bar, club và rooftop đã xác minh · Đặt bàn tức thì · Xem Happy Hour deals
                            mỗi ngày · Đừng bỏ lỡ events hot nhất tối nay.
                        </p>
                        <div className="mb-10 flex flex-wrap gap-2.5">
                            <LinkButton href="/venues" size="lg">
                                🔍 Tìm địa điểm tối nay
                            </LinkButton>
                            <LinkButton href="/lien-he" variant="secondary" size="lg">
                                Tham gia ngay →
                            </LinkButton>
                        </div>
                        <div className="flex flex-wrap">
                            {HERO_STATS.map((stat, index) => (
                                <div
                                    key={stat.label}
                                    className={["px-7 first:pl-0", index < HERO_STATS.length - 1 ? "border-r border-border" : ""].join(" ")}
                                >
                                    <p className="font-display text-3xl font-extrabold leading-none text-amber">{stat.value}</p>
                                    <p className="mt-1 text-xs text-muted">{stat.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <HeroHotTonightPanel />
            </div>
        </section>
    );
}
