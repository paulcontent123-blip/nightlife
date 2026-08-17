import { createSiteUrl } from "@/config/site";
import { NotificationService } from "./notification.service";

export class ForumNotificationService {
    constructor(private notificationService = new NotificationService()) { }

    async sendNewReply(input: {
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
        parentReply?: {
            id: string;
            user_id: string | null;
        } | null;
    }) {
        const recipientIds = createUniqueRecipients([
            input.post.user_id,
            input.parentReply?.user_id ?? null,
        ], input.reply.user_id);

        if (recipientIds.length === 0) {
            return {
                sent: false,
                skipped: true,
                reason: "no_recipient",
                recipient_count: 0,
            };
        }

        const payload = {
            title: "New forum reply",
            body: createReplyBody(input.post.title, input.reply.content),
            link: createSiteUrl(`/forum/posts/${input.post.id}`).toString(),
            data: {
                type: "forum_reply",
                post_id: input.post.id,
                reply_id: input.reply.id,
                parent_reply_id: input.parentReply?.id ?? null,
            },
        };
        const results = await Promise.allSettled(
            recipientIds.map((recipientId) => this.notificationService.sendPushToUser(recipientId, payload))
        );

        return {
            sent: results.some((result) => result.status === "fulfilled" && result.value.sent),
            recipient_count: recipientIds.length,
            fulfilled_count: results.filter((result) => result.status === "fulfilled").length,
            rejected_count: results.filter((result) => result.status === "rejected").length,
            results,
        };
    }
}

function createUniqueRecipients(userIds: Array<string | null>, actorUserId: string | null) {
    return [...new Set(userIds.filter((userId): userId is string => Boolean(userId)))]
        .filter((userId) => userId !== actorUserId);
}

function createReplyBody(postTitle: string, content: string) {
    const preview = content.replace(/\s+/g, " ").trim();
    const clippedPreview = preview.length > 80 ? `${preview.slice(0, 77)}...` : preview;

    return clippedPreview
        ? `Someone replied to "${postTitle}": ${clippedPreview}`
        : `Someone replied to "${postTitle}".`;
}
