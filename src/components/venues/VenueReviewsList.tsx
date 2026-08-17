import type { VenueReview } from "@/lib/api/types";
import { Badge } from "@/components/ui/Badge";

export function VenueReviewsList({ reviews }: { reviews: VenueReview[] }) {
    return (
        <section>
            <p className="mb-3 font-display text-lg font-extrabold">💬 Đánh giá gần đây</p>
            {reviews.length === 0 ? (
                <p className="text-sm text-muted">Venue này chưa có đánh giá nào.</p>
            ) : (
                <div className="flex flex-col gap-3">
                    {reviews.map((review) => (
                        <div key={review.id} className="rounded-xl border border-border bg-void-2 p-4">
                            <div className="mb-1.5 flex items-center gap-2">
                                <span className="text-sm text-amber">{"⭐".repeat(review.rating)}</span>
                                {review.is_verified_visit && <Badge tone="green">Đã ghé thăm</Badge>}
                            </div>
                            {review.content && <p className="text-sm leading-relaxed text-muted">{review.content}</p>}
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}
