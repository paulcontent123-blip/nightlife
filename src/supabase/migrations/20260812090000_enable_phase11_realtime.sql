-- ============================================================
-- Migration: Phase 11 Supabase Realtime
-- Description: Publish booking, squad member and ticket changes for realtime UI subscriptions.
-- ============================================================

-- Realtime UPDATE/DELETE payloads are more useful with previous row values.
ALTER TABLE public.bookings REPLICA IDENTITY FULL;
ALTER TABLE public.squad_members REPLICA IDENTITY FULL;
ALTER TABLE public.tickets REPLICA IDENTITY FULL;

-- Tickets are used by the event check-in counter. Keep frontend reads protected by RLS.
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.tickets TO authenticated;

DROP POLICY IF EXISTS "Users and admins can read tickets" ON public.tickets;

CREATE POLICY "Users and admins can read tickets"
ON public.tickets
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
    OR public.is_admin()
);

-- Add tables to the Supabase Realtime publication idempotently.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'bookings'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'squad_members'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.squad_members;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'tickets'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets;
    END IF;
END $$;
