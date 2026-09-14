import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthException } from "@/modules/auth/auth.errors";
import { BarTourService } from "@/modules/bar-tour/bar-tour.service";
import type {
    BarTourFoodSuggestion,
    BarTourRecommendationResult,
    BarTourVenueSuggestion,
} from "@/lib/api/types";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { EmptyState } from "@/components/ui/EmptyState";
import { BarTourSearchForm } from "@/components/bar-tour/BarTourSearchForm";
import { BarTourVenueCard } from "@/components/bar-tour/BarTourVenueCard";

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("BarTour");
    return { title: t("metaTitle") };
}

const FILTER_KEYS = ["keyword", "city", "district", "price_range", "party_size"] as const;

interface PageProps {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}

interface BarTourCopy {
    itinerary: string;
    allSuggestions: string;
    loadError: string;
    empty: string;
    emptyDescription: string;
    tryAgain: string;
    newLabel: string;
    reviewsLabel: string;
}

const barTourService = new BarTourService();

export default async function BarTourPage({ searchParams }: PageProps) {
    const [barTourT, commonT] = await Promise.all([
        getTranslations("BarTour"),
        getTranslations("Common"),
    ]);
    const params = await searchParams;
    const query = new URLSearchParams();

    for (const key of FILTER_KEYS) {
        const value = params[key];

        if (typeof value === "string" && value) {
            query.set(key, value);
        }
    }

    query.set("limit", "9");

    const copy: BarTourCopy = {
        itinerary: barTourT("itinerary"),
        allSuggestions: barTourT("allSuggestions"),
        loadError: barTourT("loadError"),
        empty: barTourT("empty"),
        emptyDescription: barTourT("emptyDescription"),
        tryAgain: commonT("tryAgain"),
        newLabel: commonT("new"),
        reviewsLabel: commonT("reviews"),
    };

    return (
        <div className="mx-auto min-w-0 max-w-5xl px-5 py-12 sm:px-10 sm:py-16">
            <SectionHeading
                tag={barTourT("eyebrow")}
                title={
                    <>
                        {barTourT("title")}
                        <br />
                        <em className="not-italic text-amber">{barTourT("subtitle")}</em>
                    </>
                }
                description={barTourT("description")}
            />

            <div className="mt-6">
                <Suspense fallback={null}>
                    <BarTourSearchForm />
                </Suspense>
            </div>

            <Suspense fallback={<BarTourResultsSkeleton />}>
                <BarTourResults queryString={query.toString()} copy={copy} />
            </Suspense>
        </div>
    );
}

async function BarTourResults({
    queryString,
    copy,
}: {
    queryString: string;
    copy: BarTourCopy;
}) {
    let result: BarTourRecommendationResult | null = null;
    let loadError = false;

    try {
        result = await barTourService.recommendFromSearchParams(new URLSearchParams(queryString));
    } catch (error) {
        if (error instanceof AuthException) {
            loadError = true;
        } else {
            throw error;
        }
    }

    if (loadError || !result) {
        return (
            <div className="mt-10">
                <EmptyState icon="!" title={copy.loadError} description={copy.tryAgain} />
            </div>
        );
    }

    if (result.suggestions.bars.length === 0) {
        return (
            <div className="mt-10">
                <EmptyState title={copy.empty} description={copy.emptyDescription} />
            </div>
        );
    }

    return (
        <>
            <section className="mt-10">
                <p className="mb-4 break-words font-display text-lg font-extrabold">{copy.itinerary}</p>
                <div className="flex flex-col gap-6">
                    {result.itinerary.map((step) => (
                        <div key={step.step}>
                            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-amber">{step.title}</p>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                {step.step === "bar_or_club"
                                    ? (step.suggestions as BarTourVenueSuggestion[]).map((suggestion) => (
                                        <BarTourVenueCard
                                            key={suggestion.id}
                                            suggestion={suggestion}
                                            newLabel={copy.newLabel}
                                            reviewsLabel={copy.reviewsLabel}
                                        />
                                    ))
                                    : (step.suggestions as BarTourFoodSuggestion[]).map((food, index) => (
                                        <div key={index} className="rounded-xl border border-border bg-void-2 p-4">
                                            <p className="font-display text-sm font-bold text-white">{food.title}</p>
                                            <p className="mt-1 text-xs text-muted">{food.area}</p>
                                            <p className="mt-1.5 text-xs leading-relaxed text-muted">{food.reason}</p>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section className="mt-10">
                <p className="mb-4 font-display text-lg font-extrabold">
                    {copy.allSuggestions} ({result.suggestions.bars.length})
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {result.suggestions.bars.map((suggestion) => (
                        <BarTourVenueCard
                            key={suggestion.id}
                            suggestion={suggestion}
                            newLabel={copy.newLabel}
                            reviewsLabel={copy.reviewsLabel}
                        />
                    ))}
                </div>
            </section>
        </>
    );
}

function BarTourResultsSkeleton() {
    return (
        <div className="mt-10 space-y-10" aria-busy="true" aria-label="Loading bar tour recommendations">
            <section>
                <div className="mb-4 h-6 w-48 animate-pulse rounded bg-white/10" />
                <div className="mb-3 h-3 w-28 animate-pulse rounded bg-white/10" />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {[1, 2, 3].map((item) => <BarTourCardSkeleton key={item} />)}
                </div>
            </section>
            <section>
                <div className="mb-4 h-6 w-56 animate-pulse rounded bg-white/10" />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {[1, 2, 3, 4].map((item) => <BarTourCardSkeleton key={item} />)}
                </div>
            </section>
        </div>
    );
}

function BarTourCardSkeleton() {
    return (
        <div className="min-h-36 rounded-xl border border-border bg-void-2 p-4">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-2">
                    <div className="h-4 w-3/4 animate-pulse rounded bg-white/10" />
                    <div className="h-3 w-1/2 animate-pulse rounded bg-white/10" />
                </div>
                <div className="h-6 w-16 animate-pulse rounded-md bg-white/10" />
            </div>
            <div className="mt-4 h-3 w-full animate-pulse rounded bg-white/10" />
            <div className="mt-2 h-3 w-2/3 animate-pulse rounded bg-white/10" />
        </div>
    );
}
