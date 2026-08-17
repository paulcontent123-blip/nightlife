export type ForumSort = "hot" | "new" | "top";
export type ForumModerationStatus = "all" | "approved" | "pending";
export type ForumReportStatus = "open" | "reviewed" | "dismissed";

export interface ForumPostListQuery {
    city?: string;
    tag?: string;
    venue_id?: string;
    sort: ForumSort;
    page: number;
    limit: number;
}

export interface AdminForumPostListQuery extends ForumPostListQuery {
    status: ForumModerationStatus;
}

export interface ForumReportListQuery {
    status?: ForumReportStatus;
    page: number;
    limit: number;
}

export interface CreateForumPostDTO {
    title: string;
    content: string;
    city?: string | null;
    tags?: string[];
    venue_id?: string | null;
}

export interface CreateForumReplyDTO {
    content: string;
    parent_id?: string | null;
}

export interface ReportForumPostDTO {
    reason: string;
    description?: string | null;
}

export interface ModerateForumPostDTO {
    is_approved?: boolean;
    is_pinned?: boolean;
}

export interface ModerateForumReplyDTO {
    is_approved?: boolean;
}

export interface ModerateForumReportDTO {
    status: ForumReportStatus;
}

export interface ForumPostRow {
    id: string;
    user_id: string | null;
    title: string;
    content: string;
    city: string | null;
    tags: string[] | null;
    venue_id: string | null;
    is_pinned: boolean;
    is_approved: boolean;
    view_count: number;
    reply_count: number;
    created_at: string;
}

export interface ForumReplyRow {
    id: string;
    post_id: string;
    user_id: string | null;
    parent_id: string | null;
    content: string;
    is_approved: boolean;
    helpful_count: number;
    created_at: string;
}

export interface ForumReportRow {
    id: string;
    post_id: string;
    user_id: string | null;
    reason: string;
    description: string | null;
    status: ForumReportStatus;
    created_at: string;
}

export type ForumPostRecord = Omit<ForumPostRow, "id" | "view_count" | "reply_count" | "created_at">;
export type ForumReplyRecord = Omit<ForumReplyRow, "id" | "helpful_count" | "created_at">;
export type ForumReportRecord = Omit<ForumReportRow, "id" | "status" | "created_at">;
