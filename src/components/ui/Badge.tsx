import type { HTMLAttributes } from "react";

type BadgeTone = "amber" | "pink" | "cyan" | "gray" | "green" | "red";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
    tone?: BadgeTone;
}

const tones: Record<BadgeTone, string> = {
    amber: "bg-amber-wash text-amber border-amber-border",
    pink: "bg-pink-wash text-pink border-pink/20",
    cyan: "bg-cyan-wash text-cyan border-cyan/20",
    gray: "bg-white/5 text-muted border-border-strong",
    green: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    red: "bg-red-500/10 text-red-400 border-red-500/20",
};

export function Badge({ tone = "gray", className, ...props }: BadgeProps) {
    return (
        <span
            className={[
                "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-bold tracking-wide",
                tones[tone],
                className,
            ]
                .filter(Boolean)
                .join(" ")}
            {...props}
        />
    );
}
