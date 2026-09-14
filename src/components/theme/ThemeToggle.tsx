"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

const STORAGE_KEY = "nightlife-theme";

export function ThemeToggle({ className }: { className?: string }) {
    const t = useTranslations("Theme");
    // Starts null so the server-rendered markup and the first client render
    // match exactly (avoids a hydration mismatch) — the real value is read
    // from the DOM attribute the anti-flash script already set.
    const [isLight, setIsLight] = useState<boolean | null>(null);

    useEffect(() => {
        setIsLight(document.documentElement.getAttribute("data-theme") === "light");
    }, []);

    function toggle() {
        const next = !isLight;

        setIsLight(next);
        document.documentElement.setAttribute("data-theme", next ? "light" : "dark");

        try {
            localStorage.setItem(STORAGE_KEY, next ? "light" : "dark");
        } catch {
            // Private browsing / storage disabled — theme just won't persist.
        }
    }

    return (
        <button
            type="button"
            onClick={toggle}
            aria-label={isLight ? t("toDark") : t("toLight")}
            title={isLight ? t("dark") : t("light")}
            className={[
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border-strong text-[15px] text-muted transition-colors hover:border-amber-border hover:text-amber",
                className ?? "",
            ].join(" ")}
        >
            <span aria-hidden="true">{isLight === null ? "" : isLight ? "🌙" : "☀️"}</span>
        </button>
    );
}
