-- ============================================================
-- Migration: Create Ticket Orders
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ticket_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id),
    event_id UUID REFERENCES public.events(id),
    total_amount INTEGER NOT NULL,
    platform_fee INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    payment_method TEXT,
    payment_ref TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);