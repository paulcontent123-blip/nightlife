-- ============================================================
-- Migration: Venue Tables RLS
-- Description: Public read, admin-only writes for venue tables
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.users
        WHERE id = auth.uid()
          AND role = 'admin'
    );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

ALTER TABLE public.venue_tables ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.venue_tables TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.venue_tables TO authenticated;

CREATE POLICY "Venue tables are publicly readable"
ON public.venue_tables
FOR SELECT
TO anon, authenticated
USING (TRUE);

CREATE POLICY "Admins can create venue tables"
ON public.venue_tables
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update venue tables"
ON public.venue_tables
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete venue tables"
ON public.venue_tables
FOR DELETE
TO authenticated
USING (public.is_admin());
