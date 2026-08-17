import type { Metadata } from "next";
import "./globals.css";
import { PushNotificationManager } from "@/components/notifications/PushNotificationManager";

export const metadata: Metadata = {
  title: "Nightlife.vn — Bar, Club & Events Việt Nam",
  description:
    "Khám phá bar, club, rooftop đã xác minh, đặt bàn tức thì và đừng bỏ lỡ những Happy Hour deals mỗi ngày.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Instrument+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-void text-white antialiased">
        {children}
        <PushNotificationManager />
      </body>
    </html>
  );
}
