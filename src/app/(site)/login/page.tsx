import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = { title: "Đăng nhập · Nightlife.vn" };

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
