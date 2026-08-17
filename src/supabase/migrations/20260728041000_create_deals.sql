-- ============================================================
-- Migration: Create Deals
-- Description: Happy Hour Deals & Promotions
-- ============================================================
CREATE TABLE IF NOT EXISTS public.deals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id UUID REFERENCES public.venues(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    discount_type TEXT,
    discount_value INTEGER,
    applicable_days TEXT [],
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    conditions TEXT,
    is_exclusive BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    valid_until DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);