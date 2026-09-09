import { createAdminClient } from "@/lib/supabase/admin";
import { AuthException } from "@/modules/auth/auth.errors";
import { mapForumPost, mapForumReply, mapForumReport } from "./forum.mapper";
import type {
    AdminForumPostListQuery,
    ForumPostListQuery,
    ForumPostRecord,
    ForumPostRow,
    ForumReplyRecord,
    ForumReplyRow,
    ForumReportListQuery,
    ForumReportRecord,
    ForumReportRow,
    ModerateForumPostDTO,
    ModerateForumReplyDTO,
    ModerateForumReportDTO,
} from "./forum.types";

const FORUM_POSTS_TABLE = "forum_posts";
const FORUM_REPLIES_TABLE = "forum_replies";
const FORUM_REPORTS_TABLE = "forum_reports";
const FORUM_POST_LIST_COLUMNS = [
    "id",
    "user_id",
    "title",
    "content",
    "city",
    "tags",
    "venue_id",
    "is_pinned",
    "is_approved",
    "view_count",
    "reply_count",
    "created_at",
].join(",");

type PostListRequest = {
    eq(column: string, value: unknown): PostListRequest;
    contains(column: string, value: unknown): PostListRequest;
    order(column: string, options?: Record<string, unknown>): PostListRequest;
    range(from: number, to: number): PostListRequest & {
        returns<T>(): Promise<{
            data: T | null;
            error: { message: string } | null;
            count: number | null;
        }>;
    };
};

export class ForumRepository {
    private get supabase() {
        return createAdminClient();
    }

    async listPublicPosts(query: ForumPostListQuery) {
        let request = this.createPostListQuery(query, FORUM_POST_LIST_COLUMNS, "planned")
            .eq("is_approved", true);

        request = this.applyPostSort(request, query.sort);

        return this.paginatePosts(request, query.page, query.limit);
    }

    async listAdminPosts(query: AdminForumPostListQuery) {
        let request = this.createPostListQuery(query, "*", "exact");

        if (query.status === "approved") {
            request = request.eq("is_approved", true);
        }

        if (query.status === "pending") {
            request = request.eq("is_approved", false);
        }

        request = this.applyPostSort(request, query.sort);

        return this.paginatePosts(request, query.page, query.limit);
    }

    async findPublicPostById(postId: string) {
        const { data, error } = await this.supabase
            .from(FORUM_POSTS_TABLE)
            .select("*")
            .eq("id", postId)
            .eq("is_approved", true)
            .maybeSingle<ForumPostRow>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return data ? mapForumPost(data) : null;
    }

    async findAnyPostById(postId: string) {
        const { data, error } = await this.supabase
            .from(FORUM_POSTS_TABLE)
            .select("*")
            .eq("id", postId)
            .maybeSingle<ForumPostRow>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return data ? mapForumPost(data) : null;
    }

    async findRawPostById(postId: string) {
        const { data, error } = await this.supabase
            .from(FORUM_POSTS_TABLE)
            .select("*")
            .eq("id", postId)
            .maybeSingle<ForumPostRow>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return data;
    }

    async createPost(input: ForumPostRecord) {
        const { data, error } = await this.supabase
            .from(FORUM_POSTS_TABLE)
            .insert(input)
            .select("*")
            .single<ForumPostRow>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return mapForumPost(data);
    }

    async updatePost(postId: string, input: ModerateForumPostDTO) {
        const { data, error } = await this.supabase
            .from(FORUM_POSTS_TABLE)
            .update(input)
            .eq("id", postId)
            .select("*")
            .single<ForumPostRow>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return mapForumPost(data);
    }

    async deletePost(postId: string) {
        const { data, error } = await this.supabase
            .from(FORUM_POSTS_TABLE)
            .delete()
            .eq("id", postId)
            .select("*")
            .single<ForumPostRow>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return mapForumPost(data);
    }

    async incrementViewCount(postId: string) {
        const post = await this.findRawPostById(postId);

        if (!post) {
            return;
        }

        const { error } = await this.supabase
            .from(FORUM_POSTS_TABLE)
            .update({ view_count: post.view_count + 1 })
            .eq("id", postId);

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }
    }

    async listApprovedReplies(postId: string) {
        const { data, error } = await this.supabase
            .from(FORUM_REPLIES_TABLE)
            .select("*")
            .eq("post_id", postId)
            .eq("is_approved", true)
            .order("created_at", { ascending: true })
            .returns<ForumReplyRow[]>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return (data ?? []).map(mapForumReply);
    }

    async listAllReplies(postId: string) {
        const { data, error } = await this.supabase
            .from(FORUM_REPLIES_TABLE)
            .select("*")
            .eq("post_id", postId)
            .order("created_at", { ascending: true })
            .returns<ForumReplyRow[]>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return (data ?? []).map(mapForumReply);
    }

    async findRawReplyById(replyId: string) {
        const { data, error } = await this.supabase
            .from(FORUM_REPLIES_TABLE)
            .select("*")
            .eq("id", replyId)
            .maybeSingle<ForumReplyRow>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return data;
    }

    async createReply(input: ForumReplyRecord) {
        const { data, error } = await this.supabase
            .from(FORUM_REPLIES_TABLE)
            .insert(input)
            .select("*")
            .single<ForumReplyRow>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        await this.incrementReplyCount(input.post_id);

        return mapForumReply(data);
    }

    async updateReply(replyId: string, input: ModerateForumReplyDTO) {
        const { data, error } = await this.supabase
            .from(FORUM_REPLIES_TABLE)
            .update(input)
            .eq("id", replyId)
            .select("*")
            .single<ForumReplyRow>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return mapForumReply(data);
    }

    async deleteReply(replyId: string) {
        const reply = await this.findRawReplyById(replyId);

        if (!reply) {
            throw new AuthException(404, "FORUM_REPLY_NOT_FOUND");
        }

        const { data, error } = await this.supabase
            .from(FORUM_REPLIES_TABLE)
            .delete()
            .eq("id", replyId)
            .select("*")
            .single<ForumReplyRow>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        await this.decrementReplyCount(reply.post_id);

        return mapForumReply(data);
    }

    async createReport(input: ForumReportRecord) {
        const { data, error } = await this.supabase
            .from(FORUM_REPORTS_TABLE)
            .upsert(input, { onConflict: "post_id,user_id" })
            .select("*")
            .single<ForumReportRow>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return mapForumReport(data);
    }

    async listReports(query: ForumReportListQuery) {
        const from = (query.page - 1) * query.limit;
        const to = from + query.limit - 1;
        let request = this.supabase
            .from(FORUM_REPORTS_TABLE)
            .select("*, forum_posts(title, content, is_approved)", { count: "exact" });

        if (query.status) {
            request = request.eq("status", query.status);
        }

        const { data, error, count } = await request
            .order("created_at", { ascending: false })
            .range(from, to)
            .returns<Array<ForumReportRow & { forum_posts: { title: string; content: string; is_approved: boolean } | null }>>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        const total = count ?? 0;

        return {
            items: (data ?? []).map(mapForumReport),
            pagination: {
                page: query.page,
                limit: query.limit,
                total,
                total_pages: Math.ceil(total / query.limit),
            },
        };
    }

    async updateReport(reportId: string, input: ModerateForumReportDTO) {
        const { data, error } = await this.supabase
            .from(FORUM_REPORTS_TABLE)
            .update(input)
            .eq("id", reportId)
            .select("*")
            .single<ForumReportRow>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return mapForumReport(data);
    }

    private createPostListQuery(
        query: ForumPostListQuery,
        columns: string,
        count: "exact" | "planned"
    ) {
        let request = this.supabase
            .from(FORUM_POSTS_TABLE)
            .select(columns, { count }) as unknown as PostListRequest;

        if (query.city) {
            request = request.eq("city", query.city);
        }

        if (query.tag) {
            request = request.contains("tags", [query.tag]);
        }

        if (query.venue_id) {
            request = request.eq("venue_id", query.venue_id);
        }

        return request;
    }

    private applyPostSort(
        request: PostListRequest,
        sort: ForumPostListQuery["sort"]
    ) {
        request = request.order("is_pinned", { ascending: false });

        if (sort === "new") {
            return request.order("created_at", { ascending: false });
        }

        if (sort === "top") {
            return request
                .order("reply_count", { ascending: false })
                .order("view_count", { ascending: false })
                .order("created_at", { ascending: false });
        }

        return request
            .order("reply_count", { ascending: false })
            .order("view_count", { ascending: false })
            .order("created_at", { ascending: false });
    }

    private async paginatePosts(
        request: PostListRequest,
        page: number,
        limit: number
    ) {
        const from = (page - 1) * limit;
        const to = from + limit - 1;
        const { data, error, count } = await request
            .range(from, to)
            .returns<ForumPostRow[]>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        const total = count ?? 0;

        return {
            items: (data ?? []).map(mapForumPost),
            pagination: {
                page,
                limit,
                total,
                total_pages: Math.ceil(total / limit),
            },
        };
    }

    private async incrementReplyCount(postId: string) {
        const post = await this.findRawPostById(postId);

        if (!post) {
            throw new AuthException(404, "FORUM_POST_NOT_FOUND");
        }

        const { error } = await this.supabase
            .from(FORUM_POSTS_TABLE)
            .update({ reply_count: post.reply_count + 1 })
            .eq("id", postId);

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }
    }

    private async decrementReplyCount(postId: string) {
        const post = await this.findRawPostById(postId);

        if (!post) {
            return;
        }

        const { error } = await this.supabase
            .from(FORUM_POSTS_TABLE)
            .update({ reply_count: Math.max(post.reply_count - 1, 0) })
            .eq("id", postId);

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }
    }
}
