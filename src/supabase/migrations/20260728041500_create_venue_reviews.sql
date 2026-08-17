-- ============================================================
-- Migration: Create Venue Reviews
-- Description: Venue Reviews & Ratings
-- ============================================================
CREATE TABLE IF NOT EXISTS public.venue_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id UUID REFERENCES public.venues(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id),
    booking_id UUID REFERENCES public.bookings(id),
    rating SMALLINT NOT NULL CHECK (
        rating BETWEEN 1 AND 5
    ),
    atmosphere_rating SMALLINT,
    service_rating SMALLINT,
    value_rating SMALLINT,
    content TEXT,
    visited_date DATE,
    images TEXT [],
    is_verified_visit BOOLEAN DEFAULT FALSE,
    helpful_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE public.venue_reviews IS 'User reviews for venues';
COMMENT ON COLUMN public.venue_reviews.booking_id IS 'Booking used to verify the customer visited the venue';
COMMENT ON COLUMN public.venue_reviews.rating IS 'Overall rating (1-5)';
COMMENT ON COLUMN public.venue_reviews.atmosphere_rating IS 'Atmosphere rating';
COMMENT ON COLUMN public.venue_reviews.service_rating IS 'Service rating';
COMMENT ON COLUMN public.venue_reviews.value_rating IS 'Value for money rating';
COMMENT ON COLUMN public.venue_reviews.is_verified_visit IS 'Whether the review is verified by a completed booking';