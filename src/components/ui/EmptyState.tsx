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
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border-strong bg-void-2 px-6 py-16 text-center">
            <span className="text-3xl">{icon}</span>
            <p className="font-display text-lg font-bold text-white">{title}</p>
            {description && <p className="max-w-sm text-sm text-muted">{description}</p>}
            {action}
        </div>
    );
}
