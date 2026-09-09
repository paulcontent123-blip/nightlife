export default function VenueDetailLoading() {
    return (
        <div className="animate-pulse">
            <div className="h-64 border-b border-border bg-void-3 sm:h-80" />
            <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-5 py-10 sm:px-10 lg:grid-cols-[1fr_360px]">
                <div className="flex flex-col gap-5">
                    <div className="h-16 rounded-xl border border-border bg-void-2" />
                    <div className="h-28 rounded-xl border border-border bg-void-2" />
                    <div className="h-40 rounded-xl border border-border bg-void-2" />
                </div>
                <div className="h-96 rounded-xl border border-border bg-void-2" />
            </div>
        </div>
    );
}
