import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

const fieldClasses =
    "w-full rounded-lg border-[1.5px] border-border-strong bg-void-3 px-3.5 py-2.5 text-sm text-white placeholder:text-muted-2 outline-none transition-colors focus:border-amber disabled:opacity-50";

export function Label({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
    return (
        <label
            htmlFor={htmlFor}
            className="font-display text-[10.5px] font-bold uppercase tracking-wide text-muted"
        >
            {children}
        </label>
    );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
    return <input className={[fieldClasses, className].filter(Boolean).join(" ")} {...props} />;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
    { className, ...props },
    ref
) {
    return (
        <textarea
            ref={ref}
            className={[fieldClasses, "min-h-24 resize-none", className].filter(Boolean).join(" ")}
            {...props}
        />
    );
});

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
    return (
        <select className={[fieldClasses, className].filter(Boolean).join(" ")} {...props}>
            {children}
        </select>
    );
}

export function FieldGroup({ label, htmlFor, children }: { label: string; htmlFor?: string; children: ReactNode }) {
    return (
        <div className="flex flex-col gap-1.5">
            <Label htmlFor={htmlFor}>{label}</Label>
            {children}
        </div>
    );
}
