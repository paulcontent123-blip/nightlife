import Link from "next/link";
import { AuthException } from "@/modules/auth/auth.errors";
import { ForumListService } from "@/modules/forums/forum-list.service";
import type { ForumPost, Paginated } from "@/lib/api/types";
import { ForumPostCard } from "@/components/forum/ForumPostCard";

const forumListService = new ForumListService();

export async function VenueForumDiscussion({ venueId, venueName }: { venueId: string; venueName: string }) {
    let result: Paginated<ForumPost> = { items: [], pagination: { page: 1, limit: 3, total: 0, total_pages: 0 } };

    try {
        result = await forumListService.listPublicPosts(
            new URLSearchParams({ venue_id: venueId, sort: "new", limit: "3" })
        );
    } catch (error) {
        if (!(error instanceof AuthException)) {
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
                <Link href={composeHref} prefetch={false} className="text-xs font-semibold text-amber hover:underline">
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
                        <Link href={filterHref} prefetch={false} className="self-start text-xs font-semibold text-amber hover:underline">
                            Xem tất cả {result.pagination.total} bài thảo luận →
                        </Link>
                    )}
                </div>
            )}
        </section>
    );
}
