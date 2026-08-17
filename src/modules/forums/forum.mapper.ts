import type { ForumPostRow, ForumReplyRow, ForumReportRow } from "./forum.types";

export function mapForumPost(row: ForumPostRow) {
    return {
        id: row.id,
        user_id: row.user_id,
        title: row.title,
        content: row.content,
        city: row.city,
        tags: row.tags ?? [],
        venue_id: row.venue_id,
        is_pinned: row.is_pinned,
        is_approved: row.is_approved,
        metrics: {
            view_count: row.view_count,
            reply_count: row.reply_count,
        },
        created_at: row.created_at,
    };
}

export function mapForumReply(row: ForumReplyRow) {
    return {
        id: row.id,
        post_id: row.post_id,
        user_id: row.user_id,
        parent_id: row.parent_id,
        content: row.content,
        is_approved: row.is_approved,
        helpful_count: row.helpful_count,
        created_at: row.created_at,
    };
}

interface JoinedForumPost {
    title: string;
    content: string;
    is_approved: boolean;
}

export function mapForumReport(row: ForumReportRow & { forum_posts?: JoinedForumPost | null }) {
    return {
        id: row.id,
        post_id: row.post_id,
        user_id: row.user_id,
        reason: row.reason,
        description: row.description,
        status: row.status,
        created_at: row.created_at,
        post: row.forum_posts
            ? {
                title: row.forum_posts.title,
                content: row.forum_posts.content,
                is_approved: row.forum_posts.is_approved,
            }
            : undefined,
    };
}
