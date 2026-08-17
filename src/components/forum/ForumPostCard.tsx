import Link from "next/link";
import type { ForumPost } from "@/lib/api/types";
import { Badge } from "@/components/ui/Badge";
import { CITY_LABEL, shortUserId } from "@/lib/format";

export function ForumPostCard({ post }: { post: ForumPost }) {
    return (
        <Link
            href={`/forum/${post.id}`}
            className="block rounded-xl border border-border bg-void-2 p-4 transition-colors hover:border-amber-border"
        >
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
                {post.is_pinned && <Badge tone="amber">📌 Ghim</Badge>}
                {post.city && <Badge tone="cyan">{CITY_LABEL[post.city] ?? post.city}</Badge>}
                {post.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-muted">
                        {tag}
                    </span>
                ))}
            </div>
            <p className="mb-1 font-display text-[15px] font-bold text-white">{post.title}</p>
            <p className="mb-3 line-clamp-2 text-sm text-muted">{post.content}</p>
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted">
                <span>{shortUserId(post.user_id)}</span>
                <span className="text-amber">{post.metrics.reply_count} trả lời</span>
                <span>{post.metrics.view_count} lượt xem</span>
            </div>
        </Link>
    );
}
