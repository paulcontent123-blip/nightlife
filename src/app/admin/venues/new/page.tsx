import type { Metadata } from "next";
import Link from "next/link";
import { VenueForm } from "@/components/admin/VenueForm";
import { Card } from "@/components/ui/Card";

export const metadata: Metadata = { title: "Thêm venue · Admin Nightlife.vn" };

export default function NewVenuePage() {
    return (
        <div className="max-w-3xl">
            <div className="mb-6">
                <Link href="/admin/venues" className="mb-3 inline-block text-sm text-muted hover:text-white">
                    ← Venues
                </Link>
                <h1 className="font-display text-2xl font-extrabold">Thêm venue mới</h1>
                <p className="mt-1 text-sm text-muted">Ảnh và bàn có thể thêm sau khi tạo venue.</p>
            </div>
            <Card className="p-5">
                <VenueForm mode="create" />
            </Card>
        </div>
    );
}
