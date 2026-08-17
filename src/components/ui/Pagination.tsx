import Link from "next/link";
import type { Pagination as PaginationData } from "@/lib/api/types";

interface PaginationProps {
    pagination: PaginationData;
    buildHref: (page: number) => string;
}

export function Pagination({ pagination, buildHref }: PaginationProps) {
    const { page, total_pages } = pagination;

    if (total_pages <= 1) {
        return null;
    }

    const pages = Array.from({ length: total_pages }, (_, index) => index + 1).filter(
        (candidate) => candidate === 1 || candidate === total_pages || Math.abs(candidate - page) <= 1
    );

    return (
        <nav className="flex items-center justify-center gap-1.5 pt-6">
            <PageLink href={buildHref(Math.max(1, page - 1))} disabled={page <= 1}>
                ←
            </PageLink>
            {pages.map((candidate, index) => (
                <span key={candidate} className="flex items-center gap-1.5">
                    {index > 0 && candidate - pages[index - 1] > 1 && (
                        <span className="px-1 text-sm text-muted">…</span>
                    )}
                    <Link
                        href={buildHref(candidate)}
                        className={[
                            "flex h-9 min-w-9 items-center justify-center rounded-lg border px-2 text-sm font-semibold transition-colors",
                            candidate === page
                                ? "border-amber-border bg-amber-wash text-amber"
                                : "border-border-strong text-muted hover:border-amber-border hover:text-amber",
                        ].join(" ")}
                    >
                        {candidate}
                    </Link>
                </span>
            ))}
            <PageLink href={buildHref(Math.min(total_pages, page + 1))} disabled={page >= total_pages}>
                →
            </PageLink>
        </nav>
    );
}

function PageLink({ href, disabled, children }: { href: string; disabled: boolean; children: string }) {
    if (disabled) {
        return (
            <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-sm text-muted-2">
                {children}
            </span>
        );
    }

    return (
        <Link
            href={href}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border-strong text-sm text-white transition-colors hover:border-amber-border hover:text-amber"
        >
            {children}
        </Link>
    );
}
