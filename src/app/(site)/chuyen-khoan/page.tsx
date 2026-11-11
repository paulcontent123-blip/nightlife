import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { serverFetch } from "@/lib/api/server";
import { ApiError } from "@/lib/api/envelope";
import type { BankTransferInstructions } from "@/lib/api/types";
import { BankTransferPanel, BankTransferUnavailable } from "@/components/payments/BankTransferPanel";

export const metadata: Metadata = {
    title: "Chuyển khoản · Nightlife.vn",
    robots: { index: false, follow: false },
};

interface PageProps {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function BankTransferPage({ searchParams }: PageProps) {
    const query = await searchParams;
    const purpose = typeof query.purpose === "string" ? query.purpose : "";
    const ref = typeof query.ref === "string" ? query.ref : "";
    const params = new URLSearchParams({ purpose, ref });

    let payment: BankTransferInstructions | null = null;

    try {
        payment = await serverFetch<BankTransferInstructions>(`/api/v1/payments/bank-transfer?${params.toString()}`);
    } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
            redirect(`/login?next=${encodeURIComponent(`/chuyen-khoan?${params.toString()}`)}`);
        }

        if (!(error instanceof ApiError) || ![403, 404, 422].includes(error.status)) {
            throw error;
        }
    }

    return (
        <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md items-center px-4 py-12 sm:px-5">
            <div className="w-full">
                {payment ? <BankTransferPanel initial={payment} /> : <BankTransferUnavailable backHref="/" />}
            </div>
        </div>
    );
}
