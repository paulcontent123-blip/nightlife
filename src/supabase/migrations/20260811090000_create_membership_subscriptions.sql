-- ============================================================
-- Migration: Create Membership Subscriptions
-- Description: Stores membership payment requests and admin-confirmed subscriptions.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.membership_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    tier TEXT NOT NULL,
    amount INTEGER NOT NULL,
    status TEXT DEFAULT 'pending_payment',
    payment_method TEXT NOT NULL,
    payment_ref TEXT UNIQUE NOT NULL,
    starts_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    auto_renewal BOOLEAN DEFAULT TRUE,
    confirmed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT membership_subscriptions_tier_check
        CHECK (tier IN ('night_pass', 'black_card')),
    CONSTRAINT membership_subscriptions_amount_check
        CHECK (amount > 0),
    CONSTRAINT membership_subscriptions_status_check
        CHECK (status IN ('pending_payment', 'payment_received', 'active', 'cancelled', 'expired', 'rejected')),
    CONSTRAINT membership_subscriptions_payment_method_check
        CHECK (payment_method IN ('vnpay', 'momo'))
);

COMMENT ON TABLE public.membership_subscriptions IS 'Membership subscription payment requests and activation records';
COMMENT ON COLUMN public.membership_subscriptions.status IS 'pending_payment -> payment_received -> active after admin confirmation';

CREATE INDEX IF NOT EXISTS membership_subscriptions_user_status_idx
ON public.membership_subscriptions(user_id, status);

CREATE INDEX IF NOT EXISTS membership_subscriptions_payment_ref_idx
ON public.membership_subscriptions(payment_ref);

ALTER TABLE public.membership_subscriptions ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.membership_subscriptions TO authenticated;

DROP POLICY IF EXISTS "Users and admins can read membership subscriptions" ON public.membership_subscriptions;
DROP POLICY IF EXISTS "Users can create their own membership subscriptions" ON public.membership_subscriptions;
DROP POLICY IF EXISTS "Admins can update membership subscriptions" ON public.membership_subscriptions;

CREATE POLICY "Users and admins can read membership subscriptions"
ON public.membership_subscriptions
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
    OR public.is_admin()
);

CREATE POLICY "Users can create their own membership subscriptions"
ON public.membership_subscriptions
FOR INSERT
TO authenticated
WITH CHECK (
    user_id = auth.uid()
);

CREATE POLICY "Admins can update membership subscriptions"
ON public.membership_subscriptions
FOR UPDATE
TO authenticated
USING (
    public.is_admin()
)
WITH CHECK (
    public.is_admin()
);
