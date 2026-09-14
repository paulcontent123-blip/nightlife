"use client";

import type { ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { CITY_LABEL, VENUE_TYPE_EMOJI, VENUE_TYPE_LABEL } from "@/lib/format";

const TYPES = Object.keys(VENUE_TYPE_LABEL);
const CITIES = Object.keys(CITY_LABEL);

export function VenueFilterBar() {
    const t = useTranslations("Common");
    const router = useRouter();
    const searchParams = useSearchParams();

    function updateParam(key: string, value: string | null) {
        const next = new URLSearchParams(searchParams.toString());

        if (value) {
            next.set(key, value);
        } else {
            next.delete(key);
        }

        next.delete("page");
        router.push(`/venues?${next.toString()}`);
    }

    const activeType = searchParams.get("type");
    const activeCity = searchParams.get("city");
    const activeSort = searchParams.get("sort") ?? "newest";

    return (
        <div className="flex min-w-0 flex-wrap items-center gap-2">
            <FilterButton active={!activeType} onClick={() => updateParam("type", null)}>
                {t("all")}
            </FilterButton>
            {TYPES.map((type) => (
                <FilterButton key={type} active={activeType === type} onClick={() => updateParam("type", activeType === type ? null : type)}>
                    {VENUE_TYPE_EMOJI[type]} {VENUE_TYPE_LABEL[type]}
                </FilterButton>
            ))}
            <span className="mx-1 hidden h-5 w-px bg-border-strong sm:block" />
            {CITIES.map((city) => (
                <FilterButton key={city} active={activeCity === city} onClick={() => updateParam("city", activeCity === city ? null : city)}>
                    📍 {CITY_LABEL[city]}
                </FilterButton>
            ))}
            <select
                value={activeSort}
                onChange={(event) => updateParam("sort", event.target.value)}
                aria-label={t("filter")}
                className="h-9 w-full rounded-lg border-[1.5px] border-border-strong bg-void-3 px-2.5 text-xs font-semibold text-white outline-none focus:border-amber sm:ml-auto sm:w-auto"
            >
                <option value="newest">{t("newest")}</option>
                <option value="rating">{t("highestRated")}</option>
                <option value="popular">{t("popular")}</option>
            </select>
        </div>
    );
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={[
                "whitespace-nowrap rounded-lg border-[1.5px] px-3.5 py-1.5 text-[13px] font-semibold transition-colors",
                active ? "border-amber-border bg-amber-wash text-amber" : "border-border-strong text-muted hover:border-amber-border hover:text-amber",
            ].join(" ")}
        >
            {children}
        </button>
    );
}
