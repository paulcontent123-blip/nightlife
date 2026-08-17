-- ============================================================
-- Migration: Create Tickets
-- ============================================================
CREATE TABLE IF NOT EXISTS public.tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tier_id UUID REFERENCES public.ticket_tiers(id),
    event_id UUID REFERENCES public.events(id),
    user_id UUID REFERENCES public.users(id),
    order_id UUID REFERENCES public.ticket_orders(id),
    ticket_code TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'valid',
    checked_in_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);