CREATE TABLE IF NOT EXISTS public.venue_tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id UUID REFERENCES public.venues(id) ON DELETE CASCADE,
    table_name TEXT NOT NULL,
    type TEXT DEFAULT 'standard',
    capacity SMALLINT NOT NULL,
    min_spend INTEGER,
    deposit_required INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE
);
COMMENT ON TABLE public.venue_tables IS 'Tables inside each venue';