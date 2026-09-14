import type { ReactNode } from "react";

export function SectionHeading({
    tag,
    title,
    description,
}: {
    tag: string;
    title: ReactNode;
    description?: ReactNode;
}) {
    return (
        <div className="min-w-0">
            <div className="mb-3 flex min-w-0 items-center gap-2 font-display text-[11px] font-bold uppercase tracking-[2px] text-amber">
                <span className="h-px w-[18px] shrink-0 bg-amber" />
                <span className="break-words">{tag}</span>
            </div>
            <h2 className="mb-3 break-words font-display text-[28px] font-extrabold leading-[1.1] text-white sm:text-4xl">
                {title}
            </h2>
            {description && <p className="max-w-xl break-words text-[15px] leading-relaxed text-muted">{description}</p>}
        </div>
    );
}
