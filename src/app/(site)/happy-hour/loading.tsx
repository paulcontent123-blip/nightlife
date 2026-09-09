export default function HappyHourLoading() {
    return (
        <div
            className="mx-auto max-w-6xl px-5 py-16 sm:px-10"
            aria-busy="true"
            aria-label="Loading happy hour deals"
        >
            <div className="mb-3 h-3 w-40 animate-pulse rounded bg-white/10" />
            <div className="h-9 w-full max-w-xl animate-pulse rounded bg-white/10" />
            <div className="mt-3 h-5 w-full max-w-2xl animate-pulse rounded bg-white/10" />

            <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 8 }, (_, index) => (
                    <div key={index} className="h-44 animate-pulse rounded-xl border border-border bg-void-2" />
                ))}
            </div>
        </div>
    );
}
