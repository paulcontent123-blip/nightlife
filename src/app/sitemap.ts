import type { MetadataRoute } from "next";
import { createSiteUrl } from "@/config/site";
import { createAdminClient } from "@/lib/supabase/admin";

export const revalidate = 3600;

const SITEMAP_PAGE_SIZE = 1_000;

interface SitemapRow {
    slug: string;
    created_at?: string | null;
    updated_at?: string | null;
}

const staticRouteDefinitions = [
    { path: "/", changeFrequency: "daily", priority: 1 },
    { path: "/venues", changeFrequency: "daily", priority: 0.9 },
    { path: "/events", changeFrequency: "daily", priority: 0.9 },
    { path: "/happy-hour", changeFrequency: "daily", priority: 0.8 },
    { path: "/bar-tour", changeFrequency: "weekly", priority: 0.7 },
    { path: "/forum", changeFrequency: "daily", priority: 0.7 },
    { path: "/bai-viet", changeFrequency: "daily", priority: 0.8 },
    { path: "/membership", changeFrequency: "monthly", priority: 0.6 },
    { path: "/lien-he", changeFrequency: "monthly", priority: 0.5 },
] as const;

const staticRoutes: MetadataRoute.Sitemap = staticRouteDefinitions.map(({ path, ...metadata }) => ({
    url: createSiteUrl(path).toString(),
    ...metadata,
}));

async function fetchAllRows(
    fetchPage: (from: number, to: number) => Promise<SitemapRow[]>
) {
    const rows: SitemapRow[] = [];

    for (let from = 0; ; from += SITEMAP_PAGE_SIZE) {
        const page = await fetchPage(from, from + SITEMAP_PAGE_SIZE - 1);
        rows.push(...page);

        if (page.length < SITEMAP_PAGE_SIZE) {
            return rows;
        }
    }
}

async function loadVenueRows() {
    const supabase = createAdminClient();

    return fetchAllRows(async (from, to) => {
        const { data, error } = await supabase
            .from("venues")
            .select("slug,created_at")
            .eq("is_active", true)
            .order("created_at", { ascending: false })
            .range(from, to)
            .returns<SitemapRow[]>();

        if (error) {
            throw new Error(`Could not load venue sitemap entries: ${error.message}`);
        }

        return data ?? [];
    });
}

async function loadEventRows() {
    const supabase = createAdminClient();

    return fetchAllRows(async (from, to) => {
        const { data, error } = await supabase
            .from("events")
            .select("slug,created_at")
            .eq("is_active", true)
            .order("event_date", { ascending: false })
            .range(from, to)
            .returns<SitemapRow[]>();

        if (error) {
            throw new Error(`Could not load event sitemap entries: ${error.message}`);
        }

        return data ?? [];
    });
}

async function loadArticleRows() {
    const supabase = createAdminClient();
    const now = new Date().toISOString();

    return fetchAllRows(async (from, to) => {
        const { data, error } = await supabase
            .from("seo_articles")
            .select("slug,created_at,updated_at")
            .eq("status", "published")
            .not("published_at", "is", null)
            .lte("published_at", now)
            .order("published_at", { ascending: false })
            .range(from, to)
            .returns<SitemapRow[]>();

        if (error) {
            throw new Error(`Could not load article sitemap entries: ${error.message}`);
        }

        return data ?? [];
    });
}

function mapDynamicRoutes(
    rows: SitemapRow[],
    routePrefix: string,
    changeFrequency: NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>,
    priority: number
): MetadataRoute.Sitemap {
    return rows.map((row) => {
        const timestamp = row.updated_at ?? row.created_at;

        return {
            url: createSiteUrl(`${routePrefix}/${encodeURIComponent(row.slug)}`).toString(),
            ...(timestamp ? { lastModified: timestamp } : {}),
            changeFrequency,
            priority,
        };
    });
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const results = await Promise.allSettled([
        loadVenueRows(),
        loadEventRows(),
        loadArticleRows(),
    ]);
    const routes = [...staticRoutes];
    const routeConfigs = [
        { prefix: "/venues", frequency: "weekly" as const, priority: 0.8 },
        { prefix: "/events", frequency: "daily" as const, priority: 0.8 },
        { prefix: "/bai-viet", frequency: "weekly" as const, priority: 0.7 },
    ];

    results.forEach((result, index) => {
        if (result.status === "fulfilled") {
            const config = routeConfigs[index];
            routes.push(
                ...mapDynamicRoutes(
                    result.value,
                    config.prefix,
                    config.frequency,
                    config.priority
                )
            );
            return;
        }

        console.error("Sitemap data source failed", {
            source: routeConfigs[index].prefix,
            error: result.reason,
        });
    });

    return Array.from(new Map(routes.map((route) => [route.url, route])).values());
}
