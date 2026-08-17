import { Suspense } from "react";
import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata: Metadata = { title: "Đăng ký · Nightlife.vn" };

export default function RegisterPage() {
    return (
        <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-sm items-center px-5 py-16">
            <div className="w-full">
                <Suspense fallback={null}>
                    <RegisterForm />
                </Suspense>
            </div>
        </div>
    );
}
