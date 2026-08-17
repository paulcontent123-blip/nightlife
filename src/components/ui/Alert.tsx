export function Alert({ tone = "error", children }: { tone?: "error" | "success" | "info"; children: React.ReactNode }) {
    const tones = {
        error: "border-pink/30 bg-pink-wash text-pink",
        success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
        info: "border-cyan/20 bg-cyan-wash text-cyan",
    } as const;

    return (
        <div className={["rounded-lg border px-3.5 py-2.5 text-sm", tones[tone]].join(" ")}>{children}</div>
    );
}
