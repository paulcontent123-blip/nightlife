"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { clientFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/envelope";
import { notifyAuthStateChanged } from "@/lib/auth/auth-events";
import type { AuthResponse } from "@/lib/api/types";
import { Button } from "@/components/ui/Button";
import { FieldGroup, Input } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";

export function LoginForm() {
    const t = useTranslations("Auth");
    const router = useRouter();
    const searchParams = useSearchParams();
    const next = searchParams.get("next");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const data = await clientFetch<AuthResponse>("/api/v1/auth/login", {
                method: "POST",
                body: JSON.stringify({ email, password }),
            });

            notifyAuthStateChanged();
            router.push(next && next.startsWith("/") ? next : data.redirect_to);
            router.refresh();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : t("loginError"));
        } finally {
            setLoading(false);
        }
    }

    const googleHref = `/api/v1/auth/google${next ? `?next=${encodeURIComponent(next)}` : ""}`;

    return (
        <div className="min-w-0 rounded-xl border border-border bg-void-2 p-5 shadow-[0_12px_52px_rgba(0,0,0,.6)] sm:p-7">
            <p className="font-display text-xl font-extrabold">{t("loginTitle")}</p>
            <p className="mb-6 text-sm text-muted">{t("welcomeBack")}</p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <FieldGroup label="Email">
                    <Input
                        type="email"
                        required
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="you@email.com"
                        autoComplete="email"
                    />
                </FieldGroup>
                <FieldGroup label={t("password")}>
                    <Input
                        type="password"
                        required
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="••••••••"
                        autoComplete="current-password"
                    />
                </FieldGroup>
                {error && <Alert>{error}</Alert>}
                <Button type="submit" disabled={loading} className="w-full">
                    {loading ? t("loggingIn") : t("loginTitle")}
                </Button>
            </form>

            <div className="my-5 flex items-center gap-3 text-xs text-muted-2">
                <span className="h-px flex-1 bg-border-strong" />
                {t("or")}
                <span className="h-px flex-1 bg-border-strong" />
            </div>

            <a
                href={googleHref}
                className="flex h-11 items-center justify-center gap-2 rounded-lg border-[1.5px] border-border-heavy text-sm font-semibold text-white transition-colors hover:border-amber hover:text-amber"
            >
                {t("googleLogin")}
            </a>

            <p className="mt-6 text-center text-sm text-muted">
                {t("noAccount")} {" "}
                <Link href="/register" className="font-semibold text-amber">
                    {t("register")}
                </Link>
            </p>
        </div>
    );
}
