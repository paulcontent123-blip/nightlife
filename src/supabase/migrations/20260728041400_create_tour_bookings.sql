-- ============================================================
-- Migration: Create Tour Bookings
-- Description: Tour Package Bookings
-- ============================================================
CREATE TABLE IF NOT EXISTS public.tour_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id UUID REFERENCES public.tour_packages(id),
    user_id UUID REFERENCES public.users(id),
    travel_date DATE,
    group_size SMALLINT DEFAULT 1,
    total_amount INTEGER,
    status TEXT DEFAULT 'inquiry',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);