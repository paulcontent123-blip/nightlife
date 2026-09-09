import { AuthException } from "@/modules/auth/auth.errors";
import { incrementForumListCacheVersion } from "./forum-cache";
import { ForumListService } from "./forum-list.service";
import { ForumRepository } from "./forum.repository";
import {
    AdminForumPostListQuerySchema,
    CreateForumPostSchema,
    CreateForumReplySchema,
    ForumReportListQuerySchema,
    ModerateForumPostSchema,
    ModerateForumReplySchema,
    ModerateForumReportSchema,
    ReportForumPostSchema,
} from "./forum.validator";
import type {
    CreateForumPostDTO,
    CreateForumReplyDTO,
    ModerateForumPostDTO,
    ModerateForumReplyDTO,
    ModerateForumReportDTO,
    ReportForumPostDTO,
} from "./forum.types";

export class ForumService {
    private readonly forumListService: ForumListService;

    constructor(
        private repository = new ForumRepository()
    ) {
        this.forumListService = new ForumListService(repository);
    }

    async listPublicPosts(searchParams: URLSearchParams) {
        return this.forumListService.listPublicPosts(searchParams);
    }

    async listAdminPosts(searchParams: URLSearchParams) {
        const query = AdminForumPostListQuerySchema.parse(Object.fromEntries(searchParams));

        return this.repository.listAdminPosts(query);
    }

    async createPost(input: CreateForumPostDTO, userId: string) {
        const dto = CreateForumPostSchema.parse(input);

        const post = await this.repository.createPost({
            user_id: userId,
            title: dto.title,
            content: dto.content,
            city: dto.city ?? null,
            tags: dto.tags,
            venue_id: dto.venue_id ?? null,
            is_pinned: false,
            is_approved: true,
        });

        await incrementForumListCacheVersion();

        return post;
    }

    async getPostDetail(postId: string) {
        const [post, replies] = await Promise.all([
            this.repository.findPublicPostById(postId),
            this.repository.listApprovedReplies(postId),
        ]);

        if (!post) {
            throw new AuthException(404, "FORUM_POST_NOT_FOUND");
        }

        // View tracking is non-critical for rendering; do not hold the page on
        // a second database read/update round trip.
        void this.repository.incrementViewCount(postId).catch((error) => {
            console.error("Forum view count update failed", { post_id: postId, error });
        });

        return {
            ...post,
            replies,
        };
    }

    async createReply(postId: string, input: CreateForumReplyDTO, userId: string) {
        const post = await this.repository.findPublicPostById(postId);

        if (!post) {
            throw new AuthException(404, "FORUM_POST_NOT_FOUND");
        }

        const dto = CreateForumReplySchema.parse(input);
        let parentReply = null;

        if (dto.parent_id) {
            parentReply = await this.repository.findRawReplyById(dto.parent_id);

            if (!parentReply || parentReply.post_id !== postId || !parentReply.is_approved) {
                throw new AuthException(422, "FORUM_PARENT_REPLY_INVALID");
            }
        }

        const reply = await this.repository.createReply({
            post_id: postId,
            user_id: userId,
            parent_id: dto.parent_id ?? null,
            content: dto.content,
            is_approved: true,
        });

        await incrementForumListCacheVersion();

        await this.notifyNewReply({ post, reply, parentReply });

        return reply;
    }

    async reportPost(postId: string, input: ReportForumPostDTO, userId: string) {
        const post = await this.repository.findPublicPostById(postId);

        if (!post) {
            throw new AuthException(404, "FORUM_POST_NOT_FOUND");
        }

        const dto = ReportForumPostSchema.parse(input);

        return this.repository.createReport({
            post_id: postId,
            user_id: userId,
            reason: dto.reason,
            description: dto.description ?? null,
        });
    }

    async getAdminPost(postId: string) {
        const post = await this.repository.findAnyPostById(postId);

        if (!post) {
            throw new AuthException(404, "FORUM_POST_NOT_FOUND");
        }

        return post;
    }

    async listAdminPostReplies(postId: string) {
        await this.ensurePostExists(postId);

        return this.repository.listAllReplies(postId);
    }

    async moderatePost(postId: string, input: ModerateForumPostDTO) {
        await this.ensurePostExists(postId);

        const dto = ModerateForumPostSchema.parse(input);

        const post = await this.repository.updatePost(postId, dto);

        await incrementForumListCacheVersion();

        return post;
    }

    async deletePost(postId: string) {
        await this.ensurePostExists(postId);

        const post = await this.repository.deletePost(postId);

        await incrementForumListCacheVersion();

        return post;
    }

    async moderateReply(replyId: string, input: ModerateForumReplyDTO) {
        await this.ensureReplyExists(replyId);

        const dto = ModerateForumReplySchema.parse(input);

        return this.repository.updateReply(replyId, dto);
    }

    async deleteReply(replyId: string) {
        await this.ensureReplyExists(replyId);

        const reply = await this.repository.deleteReply(replyId);

        await incrementForumListCacheVersion();

        return reply;
    }

    async listReports(searchParams: URLSearchParams) {
        const query = ForumReportListQuerySchema.parse(Object.fromEntries(searchParams));

        return this.repository.listReports(query);
    }

    async moderateReport(reportId: string, input: ModerateForumReportDTO) {
        const dto = ModerateForumReportSchema.parse(input);

        return this.repository.updateReport(reportId, dto);
    }

    private async ensurePostExists(postId: string) {
        const post = await this.repository.findAnyPostById(postId);

        if (!post) {
            throw new AuthException(404, "FORUM_POST_NOT_FOUND");
        }
    }

    private async ensureReplyExists(replyId: string) {
        const reply = await this.repository.findRawReplyById(replyId);

        if (!reply) {
            throw new AuthException(404, "FORUM_REPLY_NOT_FOUND");
        }
    }

    private async notifyNewReply(input: {
        post: {
            id: string;
            title: string;
            user_id: string | null;
        };
        reply: {
            id: string;
            user_id: string | null;
            content: string;
        };
        parentReply: {
            id: string;
            user_id: string | null;
        } | null;
    }) {
        try {
            const { ForumNotificationService } = await import("@/modules/notifications/forum-notification.service");

            return await new ForumNotificationService().sendNewReply(input);
        } catch (error) {
            console.error("Forum reply push failed", {
                post_id: input.post.id,
                reply_id: input.reply.id,
                error,
            });
            return null;
        }
    }
}
