import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LoginForm } from "@/components/auth/LoginForm";

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("Auth");
    return { title: t("loginMeta") };
}

export default function LoginPage() {
    return (
        <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-sm items-center px-5 py-16">
            <div className="w-full">
                <Suspense fallback={null}>
                    <LoginForm />
                </Suspense>
            </div>
        </div>
    );
}
