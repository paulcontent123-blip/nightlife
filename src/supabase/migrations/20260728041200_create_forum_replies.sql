-- ============================================================
-- Migration: Create Forum Replies
-- Description: Replies for Community Forum
-- ============================================================
CREATE TABLE IF NOT EXISTS public.forum_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES public.forum_posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id),
    parent_id UUID REFERENCES public.forum_replies(id),
    content TEXT NOT NULL,
    is_approved BOOLEAN DEFAULT TRUE,
    helpful_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE public.forum_replies IS 'Replies to forum posts';
COMMENT ON COLUMN public.forum_replies.parent_id IS 'Parent reply for nested discussions';