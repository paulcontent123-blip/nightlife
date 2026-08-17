import type { ForumReply } from "@/lib/api/types";
import { shortUserId } from "@/lib/format";

export function ReplyItem({ reply, nested }: { reply: ForumReply; nested?: boolean }) {
    return (
        <div className={["rounded-lg border border-border-strong bg-void-3 p-3.5", nested ? "ml-8" : ""].join(" ")}>
            <div className="mb-1 flex items-center gap-2 text-xs text-muted">
                <span className="font-semibold text-white">{shortUserId(reply.user_id)}</span>
                <span>{new Date(reply.created_at).toLocaleString("vi-VN")}</span>
            </div>
            <p className="text-sm text-white">{reply.content}</p>
        </div>
    );
}
