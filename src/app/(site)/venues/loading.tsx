import { VenueResultsSkeleton } from "@/components/venues/VenueResultsSkeleton";

export default function Loading() {
    return (
        <div
            className="mx-auto max-w-6xl px-5 py-16 sm:px-10"
            aria-busy="true"
            aria-label="Loading venues"
        >
            <div className="mb-3 h-3 w-40 animate-pulse rounded bg-white/10" />
            <div className="h-9 w-full max-w-xl animate-pulse rounded bg-white/10" />
            <div className="mt-3 h-9 w-80 max-w-full animate-pulse rounded bg-white/10" />

            <div className="mt-8 flex flex-wrap gap-2">
                {Array.from({ length: 8 }, (_, index) => (
                    <div key={index} className="h-9 w-24 animate-pulse rounded-lg bg-white/10" />
                ))}
            </div>

            <VenueResultsSkeleton />
        </div>
    );
}
