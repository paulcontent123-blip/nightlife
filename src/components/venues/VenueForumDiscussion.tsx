import Link from "next/link";
import { serverFetch } from "@/lib/api/server";
import { ApiError } from "@/lib/api/envelope";
import type { ForumPost, Paginated } from "@/lib/api/types";
import { ForumPostCard } from "@/components/forum/ForumPostCard";

export async function VenueForumDiscussion({ venueId, venueName }: { venueId: string; venueName: string }) {
    let result: Paginated<ForumPost> = { items: [], pagination: { page: 1, limit: 3, total: 0, total_pages: 0 } };

    try {
        result = await serverFetch<Paginated<ForumPost>>(
            `/api/v1/forum/posts?venue_id=${venueId}&sort=new&limit=3`
        );
    } catch (error) {
        if (!(error instanceof ApiError)) {
            throw error;
        }
    }

    const encodedName = encodeURIComponent(venueName);
    const filterHref = `/forum?venue_id=${venueId}&venue_name=${encodedName}`;
    const composeHref = `${filterHref}&compose=1`;

    return (
        <section>
            <div className="mb-3 flex items-center justify-between">
                <p className="font-display text-lg font-extrabold">💬 Thảo luận về venue này</p>
                <Link href={composeHref} className="text-xs font-semibold text-amber hover:underline">
                    + Viết bài
                </Link>
            </div>

            {result.items.length === 0 ? (
                <p className="text-sm text-muted">Chưa có bài thảo luận nào về venue này. Hãy là người đầu tiên!</p>
            ) : (
                <div className="flex flex-col gap-3">
                    {result.items.map((post) => (
                        <ForumPostCard key={post.id} post={post} />
                    ))}
                    {result.pagination.total > result.items.length && (
                        <Link href={filterHref} className="self-start text-xs font-semibold text-amber hover:underline">
                            Xem tất cả {result.pagination.total} bài thảo luận →
                        </Link>
                    )}
                </div>
            )}
        </section>
    );
}
