-- ============================================================
-- Migration: Create Ticket Tiers
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ticket_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    sold INTEGER DEFAULT 0,
    includes TEXT [],
    sale_starts_at TIMESTAMPTZ,
    sale_ends_at TIMESTAMPTZ
);
COMMENT ON TABLE public.ticket_tiers IS 'Ticket pricing tiers';