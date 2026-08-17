-- ============================================================
-- Migration: Create Venues & Venue Tables
-- Description: Nightlife Venues Management
-- ============================================================
CREATE TABLE IF NOT EXISTS public.venues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    owner_id UUID REFERENCES public.users(id),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (
        type IN (
            'rooftop_bar',
            'club',
            'wine_bar',
            'live_music',
            'terrace',
            'lounge'
        )
    ),
    description TEXT,
    address TEXT NOT NULL,
    district TEXT,
    city TEXT DEFAULT 'hcm',
    lat DECIMAL(10, 7),
    lng DECIMAL(10, 7),
    phone TEXT,
    website TEXT,
    instagram TEXT,
    cover_charge INTEGER DEFAULT 0,
    price_range TEXT DEFAULT '$$' CHECK (
        price_range IN (
            '$',
            '$$',
            '$$$',
            '$$$$'
        )
    ),
    capacity INTEGER,
    min_spend INTEGER,
    dress_code TEXT,
    age_restriction INTEGER DEFAULT 18,
    open_hours JSONB,
    features TEXT [],
    thumbnail_url TEXT,
    images TEXT [],
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    is_vip_only BOOLEAN DEFAULT FALSE,
    avg_rating DECIMAL(3, 2),
    total_reviews INTEGER DEFAULT 0,
    total_bookings INTEGER DEFAULT 0,
    subscription_tier TEXT DEFAULT 'basic' CHECK (
        subscription_tier IN (
            'basic',
            'premium'
        )
    ),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE public.venues IS 'Nightlife venues';
COMMENT ON COLUMN public.venues.slug IS 'SEO friendly unique slug';
COMMENT ON COLUMN public.venues.subscription_tier IS 'Venue subscription plan';