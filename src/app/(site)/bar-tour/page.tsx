import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthException } from "@/modules/auth/auth.errors";
import { BarTourService } from "@/modules/bar-tour/bar-tour.service";
import type { BarTourFoodSuggestion, BarTourRecommendationResult, BarTourVenueSuggestion } from "@/lib/api/types";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { EmptyState } from "@/components/ui/EmptyState";
import { BarTourSearchForm } from "@/components/bar-tour/BarTourSearchForm";
import { BarTourVenueCard } from "@/components/bar-tour/BarTourVenueCard";

export const metadata: Metadata = { title: "Bar Tour · Nightlife.vn" };

const FILTER_KEYS = ["keyword", "city", "district", "price_range", "party_size"] as const;

interface PageProps {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const barTourService = new BarTourService();

export default async function BarTourPage({ searchParams }: PageProps) {
    const params = await searchParams;
    const query = new URLSearchParams();

    for (const key of FILTER_KEYS) {
        const value = params[key];

        if (typeof value === "string" && value) {
            query.set(key, value);
        }
    }

    query.set("limit", "9");

    let result: BarTourRecommendationResult | null = null;
    let loadError = false;

    try {
        result = await barTourService.recommendFromSearchParams(query);
    } catch (error) {
        if (error instanceof AuthException) {
            loadError = true;
        } else {
            throw error;
        }
    }

    return (
        <div className="mx-auto max-w-5xl px-5 py-16 sm:px-10">
            <SectionHeading
                tag="Bar Tour"
                title={
                    <>
                        Lịch trình đêm nay
                        <br />
                        <em className="not-italic text-amber">— để AI lo phần còn lại</em>
                    </>
                }
                description="Nhập mood, khu vực, số người — nhận gợi ý quán bar/club phù hợp kèm chỗ ăn trước và sau khi đi chơi."
            />

            <div className="mt-6">
                <Suspense fallback={null}>
                    <BarTourSearchForm />
                </Suspense>
            </div>

            {loadError || !result ? (
                <div className="mt-10">
                    <EmptyState icon="⚠️" title="Không tải được gợi ý" description="Vui lòng thử lại sau." />
                </div>
            ) : result.suggestions.bars.length === 0 ? (
                <div className="mt-10">
                    <EmptyState title="Không tìm thấy gợi ý phù hợp" description="Thử đổi từ khoá hoặc bộ lọc." />
                </div>
            ) : (
                <>
                    <section className="mt-10">
                        <p className="mb-4 font-display text-lg font-extrabold">🗺️ Lịch trình gợi ý</p>
                        <div className="flex flex-col gap-6">
                            {result.itinerary.map((step) => (
                                <div key={step.step}>
                                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-amber">{step.title}</p>
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        {step.step === "bar_or_club"
                                            ? (step.suggestions as BarTourVenueSuggestion[]).map((suggestion) => (
                                                <BarTourVenueCard key={suggestion.id} suggestion={suggestion} />
                                            ))
                                            : (step.suggestions as BarTourFoodSuggestion[]).map((food, index) => (
                                                <div key={index} className="rounded-xl border border-border bg-void-2 p-4">
                                                    <p className="font-display text-sm font-bold text-white">🍜 {food.title}</p>
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
                            📋 Tất cả gợi ý ({result.suggestions.bars.length})
                        </p>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {result.suggestions.bars.map((suggestion) => (
                                <BarTourVenueCard key={suggestion.id} suggestion={suggestion} />
                            ))}
                        </div>
                    </section>
                </>
            )}
        </div>
    );
}
