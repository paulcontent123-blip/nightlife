import { getTranslations } from "next-intl/server";
import { LinkButton } from "@/components/ui/LinkButton";
import { HeroHotTonightPanel } from "@/components/home/HeroHotTonightPanel";

export default async function HomePage() {
    const t = await getTranslations("Home");
    const stats = [
        { value: "2.800+", label: t("verifiedVenues") },
        { value: "48K+", label: t("monthlyBookings") },
        { value: "120+", label: t("monthlyEvents") },
        { value: "8", label: t("cities") },
    ];

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
            <div className="relative grid min-w-0 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_420px]">
                <div className="min-w-0 px-5 py-16 sm:px-10 sm:py-24 lg:py-28">
                    <div className="min-w-0 max-w-3xl">
                        <p className="mb-5 flex items-center gap-2 font-display text-[11px] font-bold uppercase tracking-[2px] text-amber">
                            <span className="h-px w-5 bg-amber" />
                            {t("eyebrow")}
                        </p>
                        <h1 className="mb-4 break-words font-display text-4xl font-extrabold leading-[1.05] sm:text-5xl lg:text-6xl">
                            {t("titleStart")} <span className="bg-gradient-to-br from-amber via-amber-2 to-amber-3 bg-clip-text text-transparent">{t("titleAccent")}</span>
                            <br />
                            <span className="font-normal text-muted">{t("titleAnswer")}</span>
                        </h1>
                        <p className="mb-8 max-w-lg text-base leading-relaxed text-muted">
                            {t("description")}
                        </p>
                        <div className="mb-10 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
                            <LinkButton href="/venues" size="lg" className="w-full sm:w-auto">
                                {t("findVenue")}
                            </LinkButton>
                            <LinkButton href="/lien-he" variant="secondary" size="lg" className="w-full sm:w-auto">
                                {t("joinNow")}
                            </LinkButton>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-4">
                            {stats.map((stat) => (
                                <div
                                    key={stat.label}
                                    className="min-w-0 border-l border-border pl-3 first:border-l-0 first:pl-0 sm:first:border-l"
                                >
                                    <p className="font-display text-2xl font-extrabold leading-none text-amber sm:text-3xl">{stat.value}</p>
                                    <p className="mt-1 break-words text-xs text-muted">{stat.label}</p>
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
