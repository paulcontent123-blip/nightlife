import type { HTMLAttributes } from "react";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={[
                "rounded-xl border border-border bg-void-2 shadow-[0_4px_28px_rgba(0,0,0,.5)]",
                className,
            ]
                .filter(Boolean)
                .join(" ")}
            {...props}
        />
    );
}
