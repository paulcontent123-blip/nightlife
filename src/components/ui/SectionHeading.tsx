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
        <div>
            <div className="mb-3 flex items-center gap-2 font-display text-[11px] font-bold uppercase tracking-[2px] text-amber">
                <span className="h-px w-[18px] bg-amber" />
                {tag}
            </div>
            <h2 className="mb-3 font-display text-3xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-4xl">
                {title}
            </h2>
            {description && <p className="max-w-xl text-[15px] leading-relaxed text-muted">{description}</p>}
        </div>
    );
}
