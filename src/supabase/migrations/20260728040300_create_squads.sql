-- ============================================================
-- Migration: Create Squads
-- Description: Squad Night Groups
-- ============================================================
CREATE TABLE IF NOT EXISTS public.squads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invite_code TEXT UNIQUE NOT NULL,
    created_by UUID REFERENCES public.users(id),
    venue_id UUID REFERENCES public.venues(id),
    booking_date DATE,
    booking_time TIME,
    party_size SMALLINT,
    budget_per_person INTEGER,
    status TEXT DEFAULT 'forming',
    bill_splitting BOOLEAN DEFAULT TRUE,
    total_bill INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);