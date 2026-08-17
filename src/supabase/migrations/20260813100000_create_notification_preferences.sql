-- ============================================================
-- Migration: Notification Preferences
-- Description: Store user opt-in settings for scheduled notification campaigns.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.notification_preferences (
    user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    happy_hour_push_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    happy_hour_city TEXT,
    happy_hour_district TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notification_preferences_happy_hour_idx
ON public.notification_preferences (happy_hour_city, happy_hour_district)
WHERE happy_hour_push_enabled = TRUE;

CREATE OR REPLACE FUNCTION public.touch_notification_preferences_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notification_preferences_touch_updated_at ON public.notification_preferences;

CREATE TRIGGER notification_preferences_touch_updated_at
BEFORE UPDATE ON public.notification_preferences
FOR EACH ROW
EXECUTE FUNCTION public.touch_notification_preferences_updated_at();

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_preferences TO authenticated;

DROP POLICY IF EXISTS "Users and admins can read notification preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Users can create their own notification preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Users and admins can update notification preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Users and admins can delete notification preferences" ON public.notification_preferences;

CREATE POLICY "Users and admins can read notification preferences"
ON public.notification_preferences
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
    OR public.is_admin()
);

CREATE POLICY "Users can create their own notification preferences"
ON public.notification_preferences
FOR INSERT
TO authenticated
WITH CHECK (
    user_id = auth.uid()
    OR public.is_admin()
);

CREATE POLICY "Users and admins can update notification preferences"
ON public.notification_preferences
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

CREATE POLICY "Users and admins can delete notification preferences"
ON public.notification_preferences
FOR DELETE
TO authenticated
USING (
    user_id = auth.uid()
    OR public.is_admin()
);
