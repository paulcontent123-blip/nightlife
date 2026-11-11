-- ============================================================
-- Migration: Bank transfer (VietQR) payments
-- Description: Admin-managed receiving bank accounts plus the columns needed
-- for a manual bank-transfer flow: the user transfers via VietQR, presses
-- "I have transferred" (payment_claimed_at), and an admin reconciles the bank
-- statement before the booking / ticket order / membership is confirmed.
-- ============================================================

-- ------------------------------------------------------------
-- Receiving bank accounts (managed in /admin/payments)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payment_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_bin TEXT NOT NULL,
    bank_code TEXT NOT NULL,
    bank_name TEXT NOT NULL,
    account_number TEXT NOT NULL,
    account_name TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT payment_accounts_bank_bin_check CHECK (bank_bin ~ '^[0-9]{6}$'),
    CONSTRAINT payment_accounts_account_number_check CHECK (account_number ~ '^[0-9A-Za-z]{6,19}$')
);

COMMENT ON TABLE public.payment_accounts IS 'Bank accounts that receive manual VietQR transfers';

-- At most one account is shown to customers at a time.
CREATE UNIQUE INDEX IF NOT EXISTS payment_accounts_single_active_idx
ON public.payment_accounts ((TRUE))
WHERE is_active;

-- Only the service role (server) reads/writes accounts.
ALTER TABLE public.payment_accounts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.payment_accounts FROM anon, authenticated;

-- ------------------------------------------------------------
-- Bookings: persist the chosen payment method and the user's transfer claim
-- ------------------------------------------------------------
ALTER TABLE public.bookings
    ADD COLUMN IF NOT EXISTS payment_method TEXT,
    ADD COLUMN IF NOT EXISTS payment_claimed_at TIMESTAMPTZ;

-- ------------------------------------------------------------
-- Ticket orders: transfer claim timestamp
-- ------------------------------------------------------------
ALTER TABLE public.ticket_orders
    ADD COLUMN IF NOT EXISTS payment_claimed_at TIMESTAMPTZ;

-- ------------------------------------------------------------
-- Membership subscriptions: allow bank_transfer + claim timestamp
-- ------------------------------------------------------------
ALTER TABLE public.membership_subscriptions
    ADD COLUMN IF NOT EXISTS payment_claimed_at TIMESTAMPTZ;

ALTER TABLE public.membership_subscriptions
    DROP CONSTRAINT IF EXISTS membership_subscriptions_payment_method_check;

ALTER TABLE public.membership_subscriptions
    ADD CONSTRAINT membership_subscriptions_payment_method_check
    CHECK (payment_method IN ('vnpay', 'momo', 'bank_transfer'));

-- ------------------------------------------------------------
-- Payment references must be unique: a transfer is matched to exactly one
-- order by its transfer content, and concurrent "I have transferred" clicks
-- must not create two ticket orders for the same hold.
--
-- Existing data may contain duplicated references (e.g. manually inserted
-- test rows such as MOCK_TXN_003). Keep the oldest row's reference and
-- suffix the others with part of their id, so no row loses its reference.
-- ------------------------------------------------------------
WITH duplicated_bookings AS (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY payment_ref ORDER BY created_at, id) AS position
    FROM public.bookings
    WHERE payment_ref IS NOT NULL
)
UPDATE public.bookings AS bookings
SET payment_ref = bookings.payment_ref || '_DUP_' || LEFT(bookings.id::TEXT, 8)
FROM duplicated_bookings
WHERE bookings.id = duplicated_bookings.id
  AND duplicated_bookings.position > 1;

WITH duplicated_ticket_orders AS (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY payment_ref ORDER BY created_at, id) AS position
    FROM public.ticket_orders
    WHERE payment_ref IS NOT NULL
)
UPDATE public.ticket_orders AS ticket_orders
SET payment_ref = ticket_orders.payment_ref || '_DUP_' || LEFT(ticket_orders.id::TEXT, 8)
FROM duplicated_ticket_orders
WHERE ticket_orders.id = duplicated_ticket_orders.id
  AND duplicated_ticket_orders.position > 1;

CREATE UNIQUE INDEX IF NOT EXISTS ticket_orders_payment_ref_unique_idx
ON public.ticket_orders (payment_ref)
WHERE payment_ref IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS bookings_payment_ref_unique_idx
ON public.bookings (payment_ref)
WHERE payment_ref IS NOT NULL;

-- Reconciliation queue lookups
CREATE INDEX IF NOT EXISTS bookings_bank_transfer_pending_idx
ON public.bookings (payment_claimed_at)
WHERE payment_method = 'bank_transfer' AND deposit_paid = FALSE AND status = 'pending';

CREATE INDEX IF NOT EXISTS ticket_orders_bank_transfer_pending_idx
ON public.ticket_orders (created_at)
WHERE payment_method = 'bank_transfer' AND status = 'pending';
