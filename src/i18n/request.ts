import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { defaultLocale, isAppLocale, localeCookieName } from "./config";

const messageLoaders = {
    vi: () => import("../../messages/vi.json"),
    en: () => import("../../messages/en.json"),
    zh: () => import("../../messages/zh.json"),
};

export default getRequestConfig(async () => {
    const cookieStore = await cookies();
    const requestedLocale = cookieStore.get(localeCookieName)?.value;
    const locale = isAppLocale(requestedLocale) ? requestedLocale : defaultLocale;
    const messages = (await messageLoaders[locale]()).default;

    return {
        locale,
        messages,
        timeZone: "Asia/Ho_Chi_Minh",
    };
});
