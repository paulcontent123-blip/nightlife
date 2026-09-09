import { hasSupabaseAuthCookie } from "@/lib/supabase/server";
import { requireAuth } from "@/modules/auth/auth.guard";
import { AuthException } from "@/modules/auth/auth.errors";
import { VenueReviewService } from "@/modules/venue-reviews/venue-review.service";
import type { EligibleReviewBooking } from "@/lib/api/types";
import { VenueReviewForm } from "@/components/venues/VenueReviewForm";

const venueReviewService = new VenueReviewService();

export async function WriteVenueReviewSection({ slug }: { slug: string }) {
    let bookings: EligibleReviewBooking[] | null = null;

    if (await hasSupabaseAuthCookie()) {
        try {
            const user = await requireAuth();
            bookings = await venueReviewService.listEligibleBookings(slug, user);
        } catch (error) {
            if (!(error instanceof AuthException)) {
                throw error;
            }
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
