import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { serverFetch } from "@/lib/api/server";
import { ApiError } from "@/lib/api/envelope";
import type { ForumPostDetail } from "@/lib/api/types";
import { Badge } from "@/components/ui/Badge";
import { RepliesSection } from "@/components/forum/RepliesSection";
import { ReplyForm } from "@/components/forum/ReplyForm";
import { ReportPostButton } from "@/components/forum/ReportPostButton";
import { CITY_LABEL, shortUserId } from "@/lib/format";

interface PageProps {
    params: Promise<{ id: string }>;
}

async function getPost(id: string): Promise<ForumPostDetail | null> {
    try {
        return await serverFetch<ForumPostDetail>(`/api/v1/forum/posts/${id}`);
    } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
            return null;
        }

        throw error;
    }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { id } = await params;
    const post = await getPost(id);

    return { title: post ? `${post.title} · Nightlife.vn` : "Bài viết không tồn tại · Nightlife.vn" };
}

export default async function ForumPostPage({ params }: PageProps) {
    const { id } = await params;
    const post = await getPost(id);

    if (!post) {
        notFound();
    }

    return (
        <div className="mx-auto max-w-3xl px-5 py-16 sm:px-10">
            <div className="rounded-xl border border-border bg-void-2 p-6">
                <div className="mb-3 flex flex-wrap items-center gap-1.5">
                    {post.is_pinned && <Badge tone="amber">📌 Ghim</Badge>}
                    {post.city && <Badge tone="cyan">{CITY_LABEL[post.city] ?? post.city}</Badge>}
                    {post.tags.map((tag) => (
                        <span key={tag} className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-muted">
                            {tag}
                        </span>
                    ))}
                </div>
                <h1 className="mb-3 font-display text-2xl font-extrabold">{post.title}</h1>
                <p className="mb-4 whitespace-pre-line text-sm leading-relaxed text-white">{post.content}</p>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3 text-xs text-muted">
                    <div className="flex items-center gap-4">
                        <span className="font-semibold text-white">{shortUserId(post.user_id)}</span>
                        <span>{post.metrics.reply_count} trả lời</span>
                        <span>{post.metrics.view_count} lượt xem</span>
                    </div>
                    <ReportPostButton postId={post.id} />
                </div>
            </div>

            <div className="mt-8">
                <p className="mb-3 font-display text-lg font-extrabold">💬 Trả lời ({post.replies.length})</p>
                <RepliesSection postId={post.id} replies={post.replies} />
                <div className="mt-4 rounded-xl border border-border bg-void-2 p-4">
                    <ReplyForm postId={post.id} />
                </div>
            </div>
        </div>
    );
}
