import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthException } from "@/modules/auth/auth.errors";
import { getCurrentUserAvailabilityPerks } from "@/modules/membership/membership-availability-access";
import { DealService } from "@/modules/deals/deal.service";
import type { PublicDeal } from "@/lib/api/types";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { EmptyState } from "@/components/ui/EmptyState";
import { HappyHourDealCard } from "@/components/deals/HappyHourDealCard";

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("Deals");
    return { title: t("metaTitle") };
}

const dealService = new DealService();

export default async function HappyHourPage() {
    const [dealsT, commonT] = await Promise.all([
        getTranslations("Deals"),
        getTranslations("Common"),
    ]);
    let deals: PublicDeal[] = [];
    let loadError = false;

    try {
        const perks = await getCurrentUserAvailabilityPerks();
        const result = await dealService.listPublicDeals(
            new URLSearchParams({ limit: "50" }),
            perks.can_view_exclusive_deals
        );

        deals = result.items;
    } catch (error) {
        if (error instanceof AuthException) {
            loadError = true;
        } else {
            throw error;
        }
    }

    return (
        <div className="mx-auto min-w-0 max-w-6xl px-5 py-12 sm:px-10 sm:py-16">
            <SectionHeading
                tag={dealsT("eyebrow")}
                title={
                    <>
                        {dealsT("title")}
                        <br />
                        <em className="not-italic text-amber">{dealsT("subtitle")}</em>
                    </>
                }
                description={dealsT("description")}
            />

            {loadError ? (
                <div className="mt-10">
                    <EmptyState icon="⚠️" title={dealsT("loadError")} description={commonT("tryAgain")} />
                </div>
            ) : deals.length === 0 ? (
                <div className="mt-10">
                    <EmptyState title={dealsT("empty")} description={dealsT("emptyDescription")} />
                </div>
            ) : (
                <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {deals.map((deal, index) => (
                        <HappyHourDealCard key={deal.id} deal={deal} index={index} />
                    ))}
                </div>
            )}
        </div>
    );
}
