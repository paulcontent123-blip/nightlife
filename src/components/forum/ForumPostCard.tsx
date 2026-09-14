import Link from "next/link";
import type { ForumPost } from "@/lib/api/types";
import { Badge } from "@/components/ui/Badge";
import { CITY_LABEL, shortUserId } from "@/lib/format";
import { getTranslations } from "next-intl/server";

export async function ForumPostCard({ post }: { post: ForumPost }) {
    const t = await getTranslations("Forum");
    return (
        <Link
            href={`/forum/${post.id}`}
            prefetch={false}
            className="block min-w-0 overflow-hidden rounded-xl border border-border bg-void-2 p-4 transition-colors hover:border-amber-border hover:bg-void-3"
        >
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
                {post.is_pinned && <Badge tone="amber">📌 {t("pinned")}</Badge>}
                {post.city && <Badge tone="cyan">{CITY_LABEL[post.city] ?? post.city}</Badge>}
                {post.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-muted">
                        {tag}
                    </span>
                ))}
            </div>
            <p className="mb-1 break-words font-display text-[15px] font-bold text-white [overflow-wrap:anywhere]">{post.title}</p>
            <p className="mb-3 line-clamp-2 break-words text-sm text-muted [overflow-wrap:anywhere]">{post.content}</p>
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted">
                <span>{shortUserId(post.user_id)}</span>
                <span className="text-amber">{post.metrics.reply_count} {t("replies")}</span>
                <span>{post.metrics.view_count} {t("views")}</span>
            </div>
        </Link>
    );
}
