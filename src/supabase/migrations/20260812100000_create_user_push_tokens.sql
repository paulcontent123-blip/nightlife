-- ============================================================
-- Migration: User Push Tokens
-- Description: Store Firebase Cloud Messaging device tokens for web/mobile push notifications.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_push_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    platform TEXT NOT NULL DEFAULT 'web',
    user_agent TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT user_push_tokens_token_unique UNIQUE (token),
    CONSTRAINT user_push_tokens_platform_check CHECK (
        platform IN ('web', 'ios', 'android')
    )
);

CREATE INDEX IF NOT EXISTS user_push_tokens_user_id_idx
ON public.user_push_tokens(user_id);

CREATE INDEX IF NOT EXISTS user_push_tokens_active_user_idx
ON public.user_push_tokens(user_id, is_active);

CREATE OR REPLACE FUNCTION public.touch_user_push_tokens_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_push_tokens_touch_updated_at ON public.user_push_tokens;

CREATE TRIGGER user_push_tokens_touch_updated_at
BEFORE UPDATE ON public.user_push_tokens
FOR EACH ROW
EXECUTE FUNCTION public.touch_user_push_tokens_updated_at();

ALTER TABLE public.user_push_tokens ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_push_tokens TO authenticated;

DROP POLICY IF EXISTS "Users and admins can read push tokens" ON public.user_push_tokens;
DROP POLICY IF EXISTS "Users can create their own push tokens" ON public.user_push_tokens;
DROP POLICY IF EXISTS "Users and admins can update push tokens" ON public.user_push_tokens;
DROP POLICY IF EXISTS "Users and admins can delete push tokens" ON public.user_push_tokens;

CREATE POLICY "Users and admins can read push tokens"
ON public.user_push_tokens
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
    OR public.is_admin()
);

CREATE POLICY "Users can create their own push tokens"
ON public.user_push_tokens
FOR INSERT
TO authenticated
WITH CHECK (
    user_id = auth.uid()
    OR public.is_admin()
);

CREATE POLICY "Users and admins can update push tokens"
ON public.user_push_tokens
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

CREATE POLICY "Users and admins can delete push tokens"
ON public.user_push_tokens
FOR DELETE
TO authenticated
USING (
    user_id = auth.uid()
    OR public.is_admin()
);
