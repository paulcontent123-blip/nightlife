-- ============================================================
-- Migration: Create Passport Point Transactions
-- Description: Stores earn/redeem history and prevents duplicate point awards.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.passport_point_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    points INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    source_type TEXT NOT NULL,
    source_id TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT passport_point_transactions_source_type_check
        CHECK (source_type IN ('venue_checkin', 'venue_review', 'ticket_order', 'reward_redeem')),
    CONSTRAINT passport_point_transactions_balance_check
        CHECK (balance_after >= 0),
    CONSTRAINT passport_point_transactions_unique_source
        UNIQUE (user_id, source_type, source_id)
);

COMMENT ON TABLE public.passport_point_transactions IS 'Passport point earn/redeem history';
COMMENT ON COLUMN public.passport_point_transactions.source_id IS 'Business source id, such as booking id, review id, ticket order id, or reward redemption id';

CREATE INDEX IF NOT EXISTS passport_point_transactions_user_created_idx
ON public.passport_point_transactions(user_id, created_at DESC);

ALTER TABLE public.passport_point_transactions ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON public.passport_point_transactions TO authenticated;

DROP POLICY IF EXISTS "Users and admins can read passport point transactions" ON public.passport_point_transactions;
DROP POLICY IF EXISTS "Users can create their own passport point transactions" ON public.passport_point_transactions;

CREATE POLICY "Users and admins can read passport point transactions"
ON public.passport_point_transactions
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
    OR public.is_admin()
);

CREATE POLICY "Users can create their own passport point transactions"
ON public.passport_point_transactions
FOR INSERT
TO authenticated
WITH CHECK (
    user_id = auth.uid()
    OR public.is_admin()
);
