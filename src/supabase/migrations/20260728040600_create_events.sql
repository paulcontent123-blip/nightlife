-- ============================================================
-- Migration: Create Events
-- Description: Event Management
-- ============================================================
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    venue_id UUID REFERENCES public.venues(id),
    title TEXT NOT NULL,
    description TEXT,
    event_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME,
    genre TEXT [],
    lineup TEXT [],
    thumbnail_url TEXT,
    images TEXT [],
    is_free BOOLEAN DEFAULT FALSE,
    age_restriction INTEGER DEFAULT 18,
    total_capacity INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE public.events IS 'Nightlife events';
COMMENT ON COLUMN public.events.genre IS 'Music genres';
COMMENT ON COLUMN public.events.lineup IS 'Artists or DJs';