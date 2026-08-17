-- ============================================================
-- Migration: Notification Jobs Queue
-- Description: Queue scheduled push/email notifications without slowing user-facing requests.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.notification_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    channel TEXT NOT NULL,
    scheduled_at TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    payload JSONB NOT NULL,
    source_type TEXT,
    source_id UUID,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    locked_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT notification_jobs_channel_check CHECK (
        channel IN ('push', 'email', 'push_email')
    ),
    CONSTRAINT notification_jobs_status_check CHECK (
        status IN ('pending', 'processing', 'sent', 'failed', 'cancelled')
    ),
    CONSTRAINT notification_jobs_attempts_check CHECK (
        attempt_count >= 0 AND max_attempts > 0
    ),
    CONSTRAINT notification_jobs_unique_source UNIQUE (
        type,
        source_type,
        source_id,
        user_id
    )
);

CREATE INDEX IF NOT EXISTS notification_jobs_due_idx
ON public.notification_jobs (scheduled_at)
WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS notification_jobs_user_idx
ON public.notification_jobs (user_id);

CREATE INDEX IF NOT EXISTS notification_jobs_source_idx
ON public.notification_jobs (source_type, source_id);

CREATE OR REPLACE FUNCTION public.touch_notification_jobs_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notification_jobs_touch_updated_at ON public.notification_jobs;

CREATE TRIGGER notification_jobs_touch_updated_at
BEFORE UPDATE ON public.notification_jobs
FOR EACH ROW
EXECUTE FUNCTION public.touch_notification_jobs_updated_at();

ALTER TABLE public.notification_jobs ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_jobs TO authenticated;

DROP POLICY IF EXISTS "Admins can read notification jobs" ON public.notification_jobs;
DROP POLICY IF EXISTS "Admins can create notification jobs" ON public.notification_jobs;
DROP POLICY IF EXISTS "Admins can update notification jobs" ON public.notification_jobs;
DROP POLICY IF EXISTS "Admins can delete notification jobs" ON public.notification_jobs;

CREATE POLICY "Admins can read notification jobs"
ON public.notification_jobs
FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE POLICY "Admins can create notification jobs"
ON public.notification_jobs
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update notification jobs"
ON public.notification_jobs
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete notification jobs"
ON public.notification_jobs
FOR DELETE
TO authenticated
USING (public.is_admin());
