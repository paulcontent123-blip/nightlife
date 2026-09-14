export default function Loading() {
    return (
        <div className="mx-auto min-w-0 max-w-5xl px-5 py-12 sm:px-10 sm:py-16" aria-busy="true" aria-label="Loading bar tour page">
            <div className="h-3 w-24 animate-pulse rounded bg-white/10" />
            <div className="mt-4 h-10 w-full max-w-md animate-pulse rounded bg-white/10" />
            <div className="mt-3 h-4 w-full max-w-xl animate-pulse rounded bg-white/10" />

            <div className="mt-8 rounded-xl border border-border bg-void-2 p-4 sm:p-5">
                <div className="h-4 w-32 animate-pulse rounded bg-white/10" />
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {[1, 2, 3, 4].map((item) => (
                        <div key={item} className="h-10 animate-pulse rounded-lg bg-white/10" />
                    ))}
                </div>
                <div className="mt-4 h-10 w-full animate-pulse rounded-lg bg-white/10 sm:w-32" />
            </div>

            <div className="mt-10 space-y-10">
                {[1, 2].map((section) => (
                    <section key={section}>
                        <div className="mb-4 h-6 w-48 animate-pulse rounded bg-white/10" />
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {[1, 2, 3].map((card) => (
                                <div key={card} className="min-h-36 rounded-xl border border-border bg-void-2 p-4">
                                    <div className="h-4 w-3/4 animate-pulse rounded bg-white/10" />
                                    <div className="mt-3 h-3 w-1/2 animate-pulse rounded bg-white/10" />
                                    <div className="mt-5 h-3 w-full animate-pulse rounded bg-white/10" />
                                    <div className="mt-2 h-3 w-2/3 animate-pulse rounded bg-white/10" />
                                </div>
                            ))}
                        </div>
                    </section>
                ))}
            </div>
        </div>
    );
}
