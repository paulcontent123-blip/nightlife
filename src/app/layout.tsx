import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import "./globals.css";
import { PushNotificationManager } from "@/components/notifications/PushNotificationManager";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Metadata");

  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [locale, messages] = await Promise.all([getLocale(), getMessages()]);

  return (
    <html lang={locale === "zh" ? "zh-CN" : locale} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=Instrument+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        {/* Runs before paint so a saved light-mode preference applies
            immediately — without this the page would flash dark first. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem("nightlife-theme")==="light"){document.documentElement.setAttribute("data-theme","light")}}catch(e){}`,
          }}
        />
      </head>
      <body className="bg-void text-white antialiased">
        <NextIntlClientProvider messages={messages}>
          {children}
          <PushNotificationManager />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
