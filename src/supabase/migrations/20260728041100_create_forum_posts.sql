-- ============================================================
-- Migration: Create Forum Posts
-- Description: Community Forum Posts
-- ============================================================
CREATE TABLE IF NOT EXISTS public.forum_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    city TEXT,
    tags TEXT [],
    venue_id UUID REFERENCES public.venues(id),
    is_pinned BOOLEAN DEFAULT FALSE,
    is_approved BOOLEAN DEFAULT TRUE,
    view_count INTEGER DEFAULT 0,
    reply_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE public.forum_posts IS 'Community discussion posts';
COMMENT ON COLUMN public.forum_posts.tags IS 'Tags associated with the post';
COMMENT ON COLUMN public.forum_posts.venue_id IS 'Referenced venue if the post is a venue review';