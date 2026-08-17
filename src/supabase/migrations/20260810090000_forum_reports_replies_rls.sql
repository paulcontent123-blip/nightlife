-- ============================================================
-- Migration: Forum Reports and Replies RLS
-- Description: Adds report storage and completes RLS for forum replies/reports.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.forum_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id),
    reason TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'open',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT forum_reports_status_check CHECK (status IN ('open', 'reviewed', 'dismissed')),
    CONSTRAINT forum_reports_post_user_unique UNIQUE (post_id, user_id)
);

COMMENT ON TABLE public.forum_reports IS 'User reports for community forum posts';
COMMENT ON COLUMN public.forum_reports.status IS 'Moderation status: open, reviewed or dismissed';

-- forum_replies: approved replies are public; authenticated users write their own replies.
ALTER TABLE public.forum_replies ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.forum_replies TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.forum_replies TO authenticated;

DROP POLICY IF EXISTS "Approved forum replies are publicly readable" ON public.forum_replies;
DROP POLICY IF EXISTS "Users can create their own forum replies" ON public.forum_replies;
DROP POLICY IF EXISTS "Users and admins can update forum replies" ON public.forum_replies;
DROP POLICY IF EXISTS "Users and admins can delete forum replies" ON public.forum_replies;

CREATE POLICY "Approved forum replies are publicly readable"
ON public.forum_replies
FOR SELECT
TO anon, authenticated
USING (
    is_approved = TRUE
    OR user_id = auth.uid()
    OR public.is_admin()
);

CREATE POLICY "Users can create their own forum replies"
ON public.forum_replies
FOR INSERT
TO authenticated
WITH CHECK (
    user_id = auth.uid()
    OR public.is_admin()
);

CREATE POLICY "Users and admins can update forum replies"
ON public.forum_replies
FOR UPDATE
TO authenticated
USING (
    user_id = auth.uid()
    OR public.is_admin()
)
WITH CHECK (
    user_id = auth.uid()
    OR public.is_admin()
);

CREATE POLICY "Users and admins can delete forum replies"
ON public.forum_replies
FOR DELETE
TO authenticated
USING (
    user_id = auth.uid()
    OR public.is_admin()
);

-- forum_reports: users can create/read their own reports; admins manage all reports.
ALTER TABLE public.forum_reports ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON public.forum_reports TO authenticated;
GRANT UPDATE, DELETE ON public.forum_reports TO authenticated;

DROP POLICY IF EXISTS "Users and admins can read forum reports" ON public.forum_reports;
DROP POLICY IF EXISTS "Users can create their own forum reports" ON public.forum_reports;
DROP POLICY IF EXISTS "Admins can update forum reports" ON public.forum_reports;
DROP POLICY IF EXISTS "Admins can delete forum reports" ON public.forum_reports;

CREATE POLICY "Users and admins can read forum reports"
ON public.forum_reports
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
    OR public.is_admin()
);

CREATE POLICY "Users can create their own forum reports"
ON public.forum_reports
FOR INSERT
TO authenticated
WITH CHECK (
    user_id = auth.uid()
);

CREATE POLICY "Admins can update forum reports"
ON public.forum_reports
FOR UPDATE
TO authenticated
USING (
    public.is_admin()
)
WITH CHECK (
    public.is_admin()
);

CREATE POLICY "Admins can delete forum reports"
ON public.forum_reports
FOR DELETE
TO authenticated
USING (
    public.is_admin()
);
