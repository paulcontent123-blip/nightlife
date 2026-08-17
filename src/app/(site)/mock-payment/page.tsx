import { Suspense } from "react";
import type { Metadata } from "next";
import { MockPaymentPanel } from "@/components/payments/MockPaymentPanel";

export const metadata: Metadata = { title: "Mô phỏng thanh toán · Nightlife.vn" };

export default function MockPaymentPage() {
    return (
        <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-sm items-center px-5 py-16">
            <div className="w-full">
                <Suspense fallback={null}>
                    <MockPaymentPanel />
                </Suspense>
            </div>
        </div>
    );
}
