export const locales = ["vi", "en", "zh"] as const;

export type AppLocale = (typeof locales)[number];

export const defaultLocale: AppLocale = "vi";
export const localeCookieName = "NEXT_LOCALE";

export function isAppLocale(value: string | undefined): value is AppLocale {
    return locales.includes(value as AppLocale);
}
