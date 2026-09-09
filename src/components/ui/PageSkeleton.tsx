type PageSkeletonKind =
    | "user-list"
    | "passport"
    | "notifications"
    | "membership"
    | "detail"
    | "admin";

function Skeleton({ className }: { className: string }) {
    return <div className={["animate-pulse rounded bg-white/10", className].join(" ")} aria-hidden="true" />;
}

function HeadingSkeleton() {
    return (
        <div>
            <Skeleton className="mb-3 h-3 w-36" />
            <Skeleton className="h-9 w-full max-w-md" />
            <Skeleton className="mt-3 h-5 w-full max-w-xl" />
        </div>
    );
}

export function PageSkeleton({ kind }: { kind: PageSkeletonKind }) {
    if (kind === "passport") {
        return (
            <div className="mx-auto max-w-5xl animate-pulse px-5 py-16 sm:px-10" aria-busy="true" aria-label="Loading passport">
                <HeadingSkeleton />
                <Skeleton className="mt-6 h-32 w-full rounded-xl" />
                <SkeletonGrid className="mt-10" count={4} height="h-44" columns="lg:grid-cols-4" />
                <Skeleton className="mt-10 h-72 w-full rounded-xl" />
            </div>
        );
    }

    if (kind === "notifications") {
        return (
            <div className="mx-auto max-w-3xl animate-pulse px-5 py-16 sm:px-10" aria-busy="true" aria-label="Loading notifications">
                <HeadingSkeleton />
                <div className="mt-8 flex flex-col gap-3">
                    {Array.from({ length: 6 }, (_, index) => (
                        <Skeleton key={index} className="h-20 w-full rounded-xl" />
                    ))}
                </div>
            </div>
        );
    }

    if (kind === "membership") {
        return (
            <div className="mx-auto max-w-5xl animate-pulse px-5 py-16 sm:px-10" aria-busy="true" aria-label="Loading membership">
                <HeadingSkeleton />
                <SkeletonGrid className="mt-10" count={3} height="h-64" columns="lg:grid-cols-3" />
                <Skeleton className="mt-8 h-36 w-full rounded-xl" />
            </div>
        );
    }

    if (kind === "detail") {
        return (
            <div className="mx-auto max-w-3xl animate-pulse px-5 py-16 sm:px-10" aria-busy="true" aria-label="Loading details">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="mt-4 h-10 w-full max-w-xl" />
                <Skeleton className="mt-3 h-5 w-full max-w-md" />
                <Skeleton className="mt-8 h-56 w-full rounded-xl" />
                <Skeleton className="mt-6 h-40 w-full rounded-xl" />
            </div>
        );
    }

    if (kind === "admin") {
        return (
            <div className="flex flex-col gap-6 animate-pulse" aria-busy="true" aria-label="Loading admin page">
                <HeadingSkeleton />
                <SkeletonGrid count={4} height="h-28" columns="lg:grid-cols-4" />
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-[28rem] w-full rounded-xl" />
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-4xl animate-pulse px-5 py-16 sm:px-10" aria-busy="true" aria-label="Loading account data">
            <HeadingSkeleton />
            <div className="mt-6 flex gap-2">
                {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-9 w-24 rounded-lg" />)}
            </div>
            <div className="mt-6 flex flex-col gap-3">
                {Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-32 w-full rounded-xl" />)}
            </div>
        </div>
    );
}

function SkeletonGrid({
    className = "",
    count,
    height,
    columns,
}: {
    className?: string;
    count: number;
    height: string;
    columns: string;
}) {
    return (
        <div className={["grid grid-cols-1 gap-4 sm:grid-cols-2", columns, className].filter(Boolean).join(" ")}>
            {Array.from({ length: count }, (_, index) => <Skeleton key={index} className={[height, "w-full rounded-xl"].join(" ")} />)}
        </div>
    );
}
