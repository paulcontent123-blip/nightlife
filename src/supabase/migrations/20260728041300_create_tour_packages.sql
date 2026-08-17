-- ============================================================
-- Migration: Create Tour Packages
-- Description: Southeast Asia Nightlife Tour Packages
-- ============================================================
CREATE TABLE IF NOT EXISTS public.tour_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    country TEXT NOT NULL,
    city TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    duration_days SMALLINT NOT NULL,
    price_per_person INTEGER NOT NULL,
    includes TEXT [],
    highlights TEXT [],
    thumbnail_url TEXT,
    images TEXT [],
    max_group_size SMALLINT DEFAULT 10,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);