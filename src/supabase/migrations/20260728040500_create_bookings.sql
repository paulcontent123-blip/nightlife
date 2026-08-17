CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id UUID REFERENCES public.venues(id),
    table_id UUID REFERENCES public.venue_tables(id),
    user_id UUID REFERENCES public.users(id),
    squad_id UUID REFERENCES public.squads(id),
    -- null nếu book cá nhân
    booking_date DATE NOT NULL,
    booking_time TIME NOT NULL,
    party_size SMALLINT NOT NULL,
    status TEXT DEFAULT 'pending',
    -- 'pending'|'confirmed'|'seated'|'completed'|'cancelled'|'no_show'
    special_requests TEXT,
    deposit_amount INTEGER DEFAULT 0,
    deposit_paid BOOLEAN DEFAULT FALSE,
    payment_ref TEXT,
    confirmed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
)