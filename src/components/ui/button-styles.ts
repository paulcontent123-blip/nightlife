export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const base =
    "inline-flex items-center justify-center gap-2 rounded-lg font-display font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 whitespace-nowrap";

const variants: Record<ButtonVariant, string> = {
    primary:
        "bg-amber text-void hover:bg-amber-2 shadow-[0_4px_24px_rgba(240,160,48,.35)] hover:-translate-y-0.5",
    secondary:
        "bg-transparent border-[1.5px] border-border-heavy text-white hover:border-amber hover:text-amber",
    ghost:
        "bg-amber-wash border-[1.5px] border-amber-border text-amber hover:bg-amber hover:text-void",
    danger:
        "bg-transparent border-[1.5px] border-pink/40 text-pink hover:bg-pink/10",
};

const sizes: Record<ButtonSize, string> = {
    sm: "h-8 px-3 text-xs",
    md: "h-11 px-5 text-sm",
    lg: "h-12 px-7 text-base",
};

export function buttonClasses(variant: ButtonVariant = "primary", size: ButtonSize = "md", className = "") {
    return [base, variants[variant], sizes[size], className].filter(Boolean).join(" ");
}
