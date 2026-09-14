import type { MetadataRoute } from "next";
import { createSiteUrl, getSiteUrl } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: "*",
            allow: "/",
            disallow: [
                "/admin",
                "/api",
                "/bookings",
                "/tickets",
                "/notifications",
                "/passport",
                "/mock-payment",
            ],
        },
        sitemap: createSiteUrl("/sitemap.xml").toString(),
        host: getSiteUrl(),
    };
}
