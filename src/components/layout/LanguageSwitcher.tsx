"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { isAppLocale, localeCookieName, locales, type AppLocale } from "@/i18n/config";

const LOCALE_SHORT_LABEL: Record<AppLocale, string> = {
    vi: "VI",
    en: "EN",
    zh: "中文",
};

export function LanguageSwitcher() {
    const currentLocale = useLocale();
    const t = useTranslations("Language");
    const router = useRouter();
    const containerRef = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(false);
    const locale = isAppLocale(currentLocale) ? currentLocale : "vi";

    useEffect(() => {
        function closeOnOutsideClick(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        }

        function closeOnEscape(event: KeyboardEvent) {
            if (event.key === "Escape") setOpen(false);
        }

        document.addEventListener("mousedown", closeOnOutsideClick);
        document.addEventListener("keydown", closeOnEscape);

        return () => {
            document.removeEventListener("mousedown", closeOnOutsideClick);
            document.removeEventListener("keydown", closeOnEscape);
        };
    }, []);

    function selectLocale(nextLocale: AppLocale) {
        document.cookie = `${localeCookieName}=${nextLocale}; Path=/; Max-Age=31536000; SameSite=Lax`;
        document.documentElement.lang = nextLocale === "zh" ? "zh-CN" : nextLocale;
        setOpen(false);
        router.refresh();
    }

    return (
        <div ref={containerRef} className="relative shrink-0">
            <button
                type="button"
                aria-label={t("label")}
                aria-expanded={open}
                aria-haspopup="listbox"
                title={t("label")}
                onClick={() => setOpen((value) => !value)}
                className="flex h-9 min-w-11 items-center justify-center gap-1 rounded-lg border border-border-strong px-2 text-[11px] font-bold text-muted transition-colors hover:border-amber-border hover:text-amber"
            >
                {LOCALE_SHORT_LABEL[locale]}
                <span aria-hidden="true" className="text-[9px]">{open ? "▴" : "▾"}</span>
            </button>

            {open && (
                <div
                    role="listbox"
                    aria-label={t("label")}
                    className="absolute right-0 top-[calc(100%+8px)] z-[70] w-40 overflow-hidden rounded-lg border border-border-strong bg-void-2 py-1.5 shadow-[0_12px_40px_rgba(0,0,0,.55)]"
                >
                    {locales.map((item) => (
                        <button
                            key={item}
                            type="button"
                            role="option"
                            aria-selected={item === locale}
                            onClick={() => selectLocale(item)}
                            className={[
                                "flex w-full items-center justify-between px-3.5 py-2 text-left text-[13px] font-medium transition-colors",
                                item === locale ? "bg-amber-wash text-amber" : "text-muted hover:bg-white/5 hover:text-white",
                            ].join(" ")}
                        >
                            <span>{t(item)}</span>
                            <span className="text-[10px] font-bold">{LOCALE_SHORT_LABEL[item]}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
