-- ============================================================
-- Migration: Create Squad Members
-- Description: Squad Participants
-- ============================================================
CREATE TABLE IF NOT EXISTS public.squad_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    squad_id UUID REFERENCES public.squads(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id),
    role TEXT DEFAULT 'member',
    status TEXT DEFAULT 'invited',
    share_amount INTEGER,
    paid BOOLEAN DEFAULT FALSE,
    joined_at TIMESTAMPTZ DEFAULT NOW()
);