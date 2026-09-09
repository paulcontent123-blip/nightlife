import { redisGetVersionAndJson, redisJsonSet } from "@/lib/redis/server";
import { BAR_TOUR_CACHE_VERSION_KEY } from "./bar-tour-cache";
import { BarTourRepository } from "./bar-tour.repository";
import type {
    BarTourRecommendationDTO,
    BarTourRecommendationQuery,
    BarTourRecommendationResult,
    BarTourDealRow,
    BarTourEventRow,
    BarTourVenueRow,
    BarTourVenueSuggestion,
    FoodSuggestion,
} from "./bar-tour.types";
import {
    BarTourRecommendationBodySchema,
    BarTourRecommendationQuerySchema,
} from "./bar-tour.validator";

const CACHE_TTL_SECONDS = 300;

interface CachedBarTourRecommendationEntry {
    version: number;
    data: BarTourRecommendationResult;
}

const KEYWORD_ALIASES: Record<string, string[]> = {
    birthday: ["birthday", "party", "celebrate", "celebration", "sinh nhat"],
    rooftop: ["rooftop", "skybar", "view", "terrace"],
    chill: ["chill", "lounge", "cocktail", "date", "quiet"],
    edm: ["edm", "dj", "live_dj", "club", "dance"],
    live: ["live", "live_music", "band", "jazz"],
    vip: ["vip", "premium", "black card", "private"],
    happy_hour: ["happy hour", "deal", "discount", "promo"],
    food: ["food", "eat", "dinner", "restaurant", "quan an", "an toi"],
};

const VENUE_TYPE_WEIGHTS: Record<string, string[]> = {
    rooftop_bar: ["rooftop", "skybar", "view", "birthday", "date"],
    club: ["club", "edm", "dj", "dance", "party"],
    wine_bar: ["wine", "date", "chill", "quiet"],
    live_music: ["live", "band", "jazz", "music"],
    terrace: ["terrace", "outdoor", "chill", "view"],
    lounge: ["lounge", "chill", "cocktail", "vip"],
};

export class BarTourService {
    constructor(private repository = new BarTourRepository()) { }

    async recommendFromSearchParams(searchParams: URLSearchParams) {
        const query = BarTourRecommendationQuerySchema.parse(Object.fromEntries(searchParams));

        return this.recommend(query);
    }

    async recommendFromBody(input: BarTourRecommendationDTO) {
        const query = BarTourRecommendationBodySchema.parse(input);

        return this.recommend(query);
    }

    private async recommend(query: BarTourRecommendationQuery) {
        return this.getCachedRecommendation(query);
    }

    private async getCachedRecommendation(query: BarTourRecommendationQuery) {
        let version = 0;
        let redisAvailable = false;

        try {
            const cached = await redisGetVersionAndJson<CachedBarTourRecommendationEntry>(
                BAR_TOUR_CACHE_VERSION_KEY,
                this.createCacheKey(query)
            );
            version = cached.version;
            redisAvailable = true;

            if (cached.value && cached.value.version === version) {
                return cached.value.data;
            }
        } catch {
            // Redis is optional; recommendations can be loaded from the database.
        }

        const data = await this.buildRecommendation(query);

        // Avoid another Redis request when the cache read already failed.
        if (!redisAvailable) {
            return data;
        }

        try {
            await redisJsonSet(this.createCacheKey(query), { version, data }, CACHE_TTL_SECONDS);
        } catch {
            // Cache failures must not block recommendations.
        }

        return data;
    }

    private async buildRecommendation(query: BarTourRecommendationQuery): Promise<BarTourRecommendationResult> {
        const tokens = createKeywordTokens(query.keyword);
        const candidates = await this.repository.listVenueCandidates(query);
        const scoredVenues = candidates
            .map((venue) => this.scoreVenue(venue, query, tokens))
            .filter((item) => item.score > 0 || tokens.length === 0)
            .sort((left, right) => right.score - left.score)
            .slice(0, query.limit);
        const venueIds = scoredVenues.map((item) => item.venue.id);
        const [deals, events] = await Promise.all([
            this.repository.listActiveDealsForVenues(venueIds),
            this.repository.listUpcomingEventsForVenues(venueIds),
        ]);
        const dealsByVenueId = groupByVenueId(deals);
        const eventsByVenueId = groupByVenueId(events);
        const bars = scoredVenues.map((item) =>
            this.createVenueSuggestion(item, dealsByVenueId, eventsByVenueId)
        );

        return {
            query: {
                keyword: query.keyword ?? null,
                city: query.city ?? null,
                district: query.district ?? null,
                price_range: query.price_range ?? null,
                party_size: query.party_size ?? null,
                limit: query.limit,
            },
            itinerary: this.createItinerary(bars, query, tokens),
            suggestions: {
                bars,
                food: createFoodSuggestions(query, tokens),
            },
            metadata: {
                mode: "rule_based_recommendation_mvp",
                data_sources: {
                    bars: "venues",
                    deals: "deals",
                    events: "events",
                    food: "heuristic_keyword_suggestions",
                },
                note: "Food suggestions are heuristic because the current schema does not include a restaurant table.",
            },
        };
    }

    private createCacheKey(query: BarTourRecommendationQuery) {
        return `cache:bar-tour:recommendations:${JSON.stringify(query)}`;
    }

    private scoreVenue(
        venue: BarTourVenueRow,
        query: BarTourRecommendationQuery,
        tokens: string[]
    ) {
        const searchableParts = [
            venue.name,
            venue.type,
            venue.description ?? "",
            venue.district ?? "",
            venue.city,
            venue.price_range,
            ...(venue.features ?? []),
        ];
        const searchableText = normalize(searchableParts.join(" "));
        const matchedKeywords = new Set<string>();
        let score = 0;

        if (query.city && venue.city === query.city) {
            score += 8;
        }

        if (query.district && venue.district?.toLowerCase() === query.district.toLowerCase()) {
            score += 10;
        }

        if (query.price_range && venue.price_range === query.price_range) {
            score += 5;
        }

        for (const token of tokens) {
            if (searchableText.includes(token)) {
                score += 14;
                matchedKeywords.add(token);
            }

            for (const alias of expandTokenAliases(token)) {
                if (searchableText.includes(alias)) {
                    score += 8;
                    matchedKeywords.add(alias);
                }
            }
        }

        for (const typeKeyword of VENUE_TYPE_WEIGHTS[venue.type] ?? []) {
            if (tokens.includes(typeKeyword)) {
                score += 10;
                matchedKeywords.add(typeKeyword);
            }
        }

        score += Math.min(Number(venue.avg_rating ?? 0) * 3, 15);
        score += Math.min(venue.total_reviews / 10, 8);
        score += Math.min(venue.total_bookings / 20, 10);

        if (query.party_size && venue.capacity && venue.capacity >= query.party_size) {
            score += 4;
        }

        return {
            venue,
            score: Math.round(score),
            matchedKeywords: [...matchedKeywords].slice(0, 8),
        };
    }

    private createVenueSuggestion(
        item: {
            venue: BarTourVenueRow;
            score: number;
            matchedKeywords: string[];
        },
        dealsByVenueId: Map<string, BarTourDealRow[]>,
        eventsByVenueId: Map<string, BarTourEventRow[]>
    ): BarTourVenueSuggestion {
        const venue = item.venue;
        const deals = dealsByVenueId.get(venue.id) ?? [];
        const events = eventsByVenueId.get(venue.id) ?? [];

        return {
            id: venue.id,
            slug: venue.slug,
            name: venue.name,
            type: venue.type,
            district: venue.district,
            city: venue.city,
            price_range: venue.price_range,
            rating: venue.avg_rating,
            total_reviews: venue.total_reviews,
            total_bookings: venue.total_bookings,
            features: venue.features ?? [],
            media: {
                thumbnail_url: venue.thumbnail_url,
            },
            score: item.score,
            reason: createVenueReason(venue, item.matchedKeywords, deals.length, events.length),
            matched_keywords: item.matchedKeywords,
            deals: deals.slice(0, 3).map((deal) => ({
                id: deal.id,
                title: deal.title,
                discount_type: deal.discount_type,
                discount_value: deal.discount_value,
                start_time: deal.start_time,
                end_time: deal.end_time,
                is_exclusive: deal.is_exclusive,
            })),
            events: events.slice(0, 3).map((event) => ({
                id: event.id,
                slug: event.slug,
                title: event.title,
                event_date: event.event_date,
                start_time: event.start_time,
                genre: event.genre ?? [],
            })),
        };
    }

    private createItinerary(
        bars: BarTourVenueSuggestion[],
        query: BarTourRecommendationQuery,
        tokens: string[]
    ) {
        const food = createFoodSuggestions(query, tokens);

        return [
            {
                step: "eat_before",
                title: "Eat before the bar",
                suggestions: food.filter((item) => item.timing !== "late_night").slice(0, 2),
            },
            {
                step: "bar_or_club",
                title: "Main nightlife stop",
                suggestions: bars.slice(0, 3),
            },
            {
                step: "late_night_food",
                title: "Late-night food backup",
                suggestions: food.filter((item) => item.timing === "late_night").slice(0, 2),
            },
        ];
    }
}

function createKeywordTokens(keyword?: string) {
    if (!keyword) {
        return [];
    }

    return [...new Set(
        normalize(keyword)
            .split(/[^a-z0-9$]+/)
            .map((token) => token.trim())
            .filter((token) => token.length >= 2)
    )];
}

function expandTokenAliases(token: string) {
    return Object.values(KEYWORD_ALIASES)
        .filter((aliases) => aliases.includes(token))
        .flat();
}

function normalize(value: string) {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
}

function groupByVenueId<T extends { venue_id: string }>(items: T[]) {
    const map = new Map<string, T[]>();

    for (const item of items) {
        const list = map.get(item.venue_id) ?? [];

        list.push(item);
        map.set(item.venue_id, list);
    }

    return map;
}

function createVenueReason(venue: BarTourVenueRow, matchedKeywords: string[], dealCount: number, eventCount: number) {
    const reasons = [
        `${venue.name} matches ${venue.type.replace(/_/g, " ")}`,
    ];

    if (matchedKeywords.length > 0) {
        reasons.push(`keywords: ${matchedKeywords.slice(0, 4).join(", ")}`);
    }

    if (venue.avg_rating) {
        reasons.push(`rating ${venue.avg_rating}`);
    }

    if (dealCount > 0) {
        reasons.push(`${dealCount} active deal${dealCount > 1 ? "s" : ""}`);
    }

    if (eventCount > 0) {
        reasons.push(`${eventCount} upcoming event${eventCount > 1 ? "s" : ""}`);
    }

    return reasons.join("; ");
}

function createFoodSuggestions(query: BarTourRecommendationQuery, tokens: string[]): FoodSuggestion[] {
    const area = [query.district, query.city].filter(Boolean).join(", ") || "near the selected nightlife area";
    const isBirthday = tokens.some((token) => ["birthday", "party", "celebrate"].includes(token));
    const isDate = tokens.some((token) => ["date", "chill", "wine"].includes(token));
    const isClubNight = tokens.some((token) => ["edm", "club", "dj", "dance"].includes(token));
    const suggestions: FoodSuggestion[] = [];

    suggestions.push({
        title: isBirthday ? "Group dinner or BBQ before drinks" : "Dinner spot before the bar",
        area,
        keywords: isBirthday ? ["bbq", "hotpot", "group dinner", "birthday"] : ["dinner", "restaurant", "pre-drinks"],
        reason: isBirthday
            ? "Good fit before a birthday nightlife plan with a larger group."
            : "Keeps the plan simple: eat first, then move to the selected bar or club.",
        timing: "before_bar",
        data_source: "heuristic",
    });

    suggestions.push({
        title: isDate ? "Quiet dinner or dessert stop" : "Casual local food stop",
        area,
        keywords: isDate ? ["date night", "dessert", "wine", "quiet"] : ["local food", "quick bite", "snacks"],
        reason: isDate
            ? "Pairs well with lounge, rooftop, wine bar, or cocktail keywords."
            : "Useful for users who want food around the same district before going out.",
        timing: isDate ? "before_bar" : "group_dining",
        data_source: "heuristic",
    });

    suggestions.push({
        title: isClubNight ? "Late-night food after clubbing" : "Late-night pho or street food backup",
        area,
        keywords: isClubNight ? ["late night", "after club", "pho", "banh mi"] : ["late night", "pho", "street food"],
        reason: "Recommended as a backup after the main nightlife stop.",
        timing: "late_night",
        data_source: "heuristic",
    });

    return suggestions;
}
