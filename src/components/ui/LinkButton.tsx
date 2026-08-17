import Link, { type LinkProps } from "next/link";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { buttonClasses, type ButtonSize, type ButtonVariant } from "./button-styles";

interface LinkButtonProps extends LinkProps, Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    children: ReactNode;
}

export function LinkButton({ variant = "primary", size = "md", className, children, ...props }: LinkButtonProps) {
    return (
        <Link className={buttonClasses(variant, size, className)} {...props}>
            {children}
        </Link>
    );
}
