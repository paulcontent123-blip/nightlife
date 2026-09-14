"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { clientFetch } from "@/lib/api/client";
import { notifyAuthStateChanged } from "@/lib/auth/auth-events";
import { Button } from "@/components/ui/Button";
import { useTranslations } from "next-intl";

export function LogoutButton() {
    const t = useTranslations("Navigation");
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    async function handleLogout() {
        setLoading(true);

        try {
            await clientFetch("/api/v1/auth/logout", { method: "POST" });
            notifyAuthStateChanged();
        } finally {
            router.push("/");
            router.refresh();
        }
    }

    return (
        <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={handleLogout}
            disabled={loading}
            aria-label={t("logout")}
            title={t("logout")}
            className="min-w-9 px-2 sm:px-3"
        >
            <span aria-hidden="true">{loading ? "..." : "↪"}</span>
            {!loading && <span className="hidden sm:inline">{t("logout")}</span>}
        </Button>
    );
}
