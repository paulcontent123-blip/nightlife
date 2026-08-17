"use client";

import { useState } from "react";
import type { ForumReply } from "@/lib/api/types";
import { ReplyItem } from "./ReplyItem";
import { ReplyForm } from "./ReplyForm";

export function RepliesSection({ postId, replies }: { postId: string; replies: ForumReply[] }) {
    const [activeParentId, setActiveParentId] = useState<string | null>(null);
    const topLevel = replies.filter((reply) => !reply.parent_id);
    const childrenOf = (id: string) => replies.filter((reply) => reply.parent_id === id);

    if (topLevel.length === 0) {
        return <p className="text-sm text-muted">Chưa có trả lời nào. Hãy là người đầu tiên!</p>;
    }

    return (
        <div className="flex flex-col gap-3">
            {topLevel.map((reply) => (
                <div key={reply.id} className="flex flex-col gap-2">
                    <ReplyItem reply={reply} />
                    <button
                        type="button"
                        onClick={() => setActiveParentId(activeParentId === reply.id ? null : reply.id)}
                        className="ml-2 self-start text-xs font-semibold text-amber hover:underline"
                    >
                        {activeParentId === reply.id ? "Huỷ trả lời" : "Trả lời"}
                    </button>
                    {activeParentId === reply.id && (
                        <div className="ml-8">
                            <ReplyForm postId={postId} parentId={reply.id} onDone={() => setActiveParentId(null)} />
                        </div>
                    )}
                    {childrenOf(reply.id).map((child) => (
                        <ReplyItem key={child.id} reply={child} nested />
                    ))}
                </div>
            ))}
        </div>
    );
}
