import { AuthException } from "@/modules/auth/auth.errors";
import { VenueListService } from "@/modules/venues/venue-list.service";
import type { Paginated, VenueListItem } from "@/lib/api/types";
import { VenueCard } from "@/components/venues/VenueCard";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { getTranslations } from "next-intl/server";

const venueListService = new VenueListService();

export async function VenueResults({ queryString }: { queryString: string }) {
    const [venuesT, commonT] = await Promise.all([
        getTranslations("Venues"),
        getTranslations("Common"),
    ]);
    const query = new URLSearchParams(queryString);
    let result: Paginated<VenueListItem>;

    try {
        result = await venueListService.listPublicVenues(query);
    } catch (error) {
        if (error instanceof AuthException) {
            return (
                <div className="mt-10">
                    <EmptyState icon="⚠️" title={venuesT("loadError")} description={commonT("tryAgain")} />
                </div>
            );
        }

        throw error;
    }

    if (result.items.length === 0) {
        return (
            <div className="mt-10">
                <EmptyState title={venuesT("empty")} description={venuesT("emptyDescription")} />
            </div>
        );
    }

    function buildHref(nextPage: number) {
        const next = new URLSearchParams(query);
        next.set("page", String(nextPage));

        return `/venues?${next.toString()}`;
    }

    return (
        <>
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {result.items.map((venue, index) => (
                    <VenueCard key={venue.id} venue={venue} priority={index < 3} />
                ))}
            </div>
            <Pagination pagination={result.pagination} buildHref={buildHref} />
        </>
    );
}
