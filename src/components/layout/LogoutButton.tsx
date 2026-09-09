"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { clientFetch } from "@/lib/api/client";
import { notifyAuthStateChanged } from "@/lib/auth/auth-events";
import { Button } from "@/components/ui/Button";

export function LogoutButton() {
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
        <Button type="button" variant="danger" size="sm" onClick={handleLogout} disabled={loading}>
            {loading ? "..." : "🚪 Đăng xuất"}
        </Button>
    );
}
