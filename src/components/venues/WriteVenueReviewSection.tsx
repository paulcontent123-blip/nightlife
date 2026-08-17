import { serverFetch } from "@/lib/api/server";
import { ApiError } from "@/lib/api/envelope";
import type { EligibleReviewBooking } from "@/lib/api/types";
import { VenueReviewForm } from "@/components/venues/VenueReviewForm";

export async function WriteVenueReviewSection({ slug }: { slug: string }) {
    let bookings: EligibleReviewBooking[] | null = null;

    try {
        bookings = await serverFetch<EligibleReviewBooking[]>(`/api/v1/venues/${slug}/reviews/eligible`);
    } catch (error) {
        if (!(error instanceof ApiError)) {
            throw error;
        }
    }

    if (bookings === null) {
        return (
            <p className="text-xs text-muted">
                <a href={`/login?next=/venues/${slug}`} className="font-semibold text-amber hover:underline">
                    Đăng nhập
                </a>{" "}
                để viết đánh giá cho venue này.
            </p>
        );
    }

    if (bookings.length === 0) {
        return <p className="text-xs text-muted">Bạn cần có một lượt đặt bàn đã xác nhận tại venue này để viết đánh giá.</p>;
    }

    return <VenueReviewForm slug={slug} bookings={bookings} />;
}
