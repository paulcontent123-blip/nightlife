import type { Metadata } from "next";
import { serverFetch } from "@/lib/api/server";
import { ApiError } from "@/lib/api/envelope";
import type { Paginated, PublicDeal } from "@/lib/api/types";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { EmptyState } from "@/components/ui/EmptyState";
import { HappyHourDealCard } from "@/components/deals/HappyHourDealCard";

export const metadata: Metadata = { title: "Happy Hour & Deals · Nightlife.vn" };

export default async function HappyHourPage() {
    let deals: PublicDeal[] = [];
    let loadError = false;

    try {
        const result = await serverFetch<Paginated<PublicDeal>>("/api/v1/deals?limit=50");

        deals = result.items;
    } catch (error) {
        if (error instanceof ApiError) {
            loadError = true;
        } else {
            throw error;
        }
    }

    return (
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-10">
            <SectionHeading
                tag="Happy Hour & Deals"
                title={
                    <>
                        Uống nhiều hơn
                        <br />
                        <em className="not-italic text-amber">— tốn ít hơn</em>
                    </>
                }
                description="Deals Happy Hour được cập nhật từ các venue đối tác — đừng bao giờ bỏ lỡ giờ vàng giảm giá."
            />

            {loadError ? (
                <div className="mt-10">
                    <EmptyState icon="⚠️" title="Không tải được danh sách deal" description="Vui lòng thử lại sau." />
                </div>
            ) : deals.length === 0 ? (
                <div className="mt-10">
                    <EmptyState title="Chưa có deal nào đang hoạt động" description="Quay lại sau — venues đối tác cập nhật deal mỗi ngày." />
                </div>
            ) : (
                <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {deals.map((deal, index) => (
                        <HappyHourDealCard key={deal.id} deal={deal} index={index} />
                    ))}
                </div>
            )}
        </div>
    );
}
