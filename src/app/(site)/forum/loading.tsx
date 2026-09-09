export default function ForumLoading() {
    return (
        <div
            className="mx-auto max-w-3xl px-5 py-16 sm:px-10"
            aria-busy="true"
            aria-label="Loading forum"
        >
            <div className="mb-3 h-3 w-44 animate-pulse rounded bg-white/10" />
            <div className="h-9 w-full max-w-xl animate-pulse rounded bg-white/10" />
            <div className="mt-6 h-10 w-full rounded-lg bg-white/10" />

            <div className="mt-6 flex flex-col gap-3">
                {Array.from({ length: 6 }, (_, index) => (
                    <div key={index} className="h-32 animate-pulse rounded-xl border border-border bg-void-2" />
                ))}
            </div>
        </div>
    );
}
