import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { serverFetch } from "@/lib/api/server";
import { ApiError } from "@/lib/api/envelope";
import type { ForumPost, ForumReply } from "@/lib/api/types";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { ForumPostActions } from "@/components/admin/ForumPostActions";
import { ForumReplyActions } from "@/components/admin/ForumReplyActions";
import { shortUserId } from "@/lib/format";

export const metadata: Metadata = { title: "Chi tiết bài viết · Admin Nightlife.vn" };

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function AdminForumPostDetailPage({ params }: PageProps) {
    const { id } = await params;
    let post: ForumPost;
    let replies: ForumReply[] = [];

    try {
        post = await serverFetch<ForumPost>(`/api/v1/admin/forum/posts/${id}`);
        const repliesResult = await serverFetch<{ items: ForumReply[] }>(`/api/v1/admin/forum/posts/${id}/replies`);
        replies = repliesResult.items;
    } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
            notFound();
        }

        throw error;
    }

    return (
        <div className="flex max-w-3xl flex-col gap-6">
            <div>
                <Link href="/admin/forum/posts" className="mb-3 inline-block text-sm text-muted hover:text-white">
                    ← Forum
                </Link>
            </div>

            <Card className="p-5">
                <div className="mb-3 flex flex-wrap items-center gap-1.5">
                    {post.is_pinned && <Badge tone="amber">Ghim</Badge>}
                    <Badge tone={post.is_approved ? "green" : "gray"}>{post.is_approved ? "Đã duyệt" : "Chờ duyệt"}</Badge>
                    {post.city && <Badge tone="cyan">{post.city}</Badge>}
                </div>
                <h1 className="mb-2 font-display text-xl font-extrabold">{post.title}</h1>
                <p className="mb-3 whitespace-pre-line text-sm text-white">{post.content}</p>
                <p className="mb-4 text-xs text-muted">
                    {shortUserId(post.user_id)} · {post.metrics.reply_count} trả lời · {post.metrics.view_count} lượt xem
                </p>
                <ForumPostActions postId={post.id} isApproved={post.is_approved} isPinned={post.is_pinned} />
            </Card>

            <div>
                <p className="mb-3 font-display text-lg font-extrabold">Trả lời ({replies.length})</p>
                {replies.length === 0 ? (
                    <p className="text-sm text-muted">Chưa có trả lời nào.</p>
                ) : (
                    <div className="flex flex-col gap-2">
                        {replies.map((reply) => (
                            <Card key={reply.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                                <div className="min-w-0 flex-1">
                                    <div className="mb-1 flex items-center gap-2">
                                        <span className="text-xs font-semibold text-white">{shortUserId(reply.user_id)}</span>
                                        <Badge tone={reply.is_approved ? "green" : "gray"}>{reply.is_approved ? "Đã duyệt" : "Chờ duyệt"}</Badge>
                                        {reply.parent_id && <span className="text-[10px] text-muted">↳ trả lời #{reply.parent_id.slice(0, 6)}</span>}
                                    </div>
                                    <p className="text-sm text-muted">{reply.content}</p>
                                </div>
                                <ForumReplyActions replyId={reply.id} isApproved={reply.is_approved} />
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
