import type { ReactNode } from "react";

export function EmptyState({
    icon = "🌙",
    title,
    description,
    action,
}: {
    icon?: string;
    title: string;
    description?: string;
    action?: ReactNode;
}) {
    return (
        <div className="flex min-w-0 flex-col items-center gap-3 rounded-xl border border-dashed border-border-strong bg-void-2 px-5 py-12 text-center sm:px-6 sm:py-16">
            <span className="text-3xl">{icon}</span>
            <p className="break-words font-display text-lg font-bold text-white">{title}</p>
            {description && <p className="max-w-sm break-words text-sm text-muted">{description}</p>}
            {action}
        </div>
    );
}
