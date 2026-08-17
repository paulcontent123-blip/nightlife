import type { Metadata } from "next";
import { Card } from "@/components/ui/Card";
import { TicketCheckinForm } from "@/components/admin/TicketCheckinForm";

export const metadata: Metadata = { title: "Check-in vé · Admin Nightlife.vn" };

export default function AdminTicketCheckinPage() {
    return (
        <div className="max-w-lg">
            <div className="mb-6">
                <p className="mb-1 text-sm font-medium text-muted">Quản lý</p>
                <h1 className="font-display text-2xl font-extrabold">Check-in vé</h1>
                <p className="mt-1 text-sm text-muted">Nhập hoặc quét mã vé để check-in khách vào sự kiện.</p>
            </div>
            <Card className="p-5">
                <TicketCheckinForm />
            </Card>
        </div>
    );
}
