export function VenueResultsSkeleton() {
    return (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
            {Array.from({ length: 6 }, (_, index) => (
                <div
                    key={index}
                    className="overflow-hidden rounded-xl border border-border bg-void-2"
                >
                    <div className="h-40 animate-pulse bg-white/10" />
                    <div className="space-y-3 p-4">
                        <div className="h-5 w-3/4 animate-pulse rounded bg-white/10" />
                        <div className="h-3 w-1/2 animate-pulse rounded bg-white/10" />
                        <div className="h-3 w-full animate-pulse rounded bg-white/10" />
                        <div className="h-4 w-2/3 animate-pulse rounded bg-white/10" />
                    </div>
                </div>
            ))}
        </div>
    );
}
