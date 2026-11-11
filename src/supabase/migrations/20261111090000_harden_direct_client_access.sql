-- ============================================================
-- Migration: Harden direct client access
-- Description: The publishable (anon) key is exposed to browsers, so any
-- signed-in user can call PostgREST directly and bypass the Next.js API.
-- All application writes go through the service role (createAdminClient),
-- which bypasses RLS and grants. Browsers only need SELECT for realtime on
-- bookings / squad_members / tickets. This migration removes every direct
-- write path that let users escalate privileges or fake payments.
-- ============================================================

-- ------------------------------------------------------------
-- 1. users: users could UPDATE their own row, including role,
--    membership_tier and nightlife_passport_points (-> self-promote to admin).
--    Profile updates are done server-side via the service role.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.users FROM anon, authenticated;

-- ------------------------------------------------------------
-- 2. bookings: users could set status='confirmed' / deposit_paid=true on
--    their own bookings. Keep SELECT (needed for realtime).
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Users can create their own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users and admins can update bookings" ON public.bookings;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.bookings FROM anon, authenticated;

-- ------------------------------------------------------------
-- 3. passport_point_transactions: users could INSERT arbitrary points.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Users can create their own passport point transactions" ON public.passport_point_transactions;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.passport_point_transactions FROM anon, authenticated;

-- ------------------------------------------------------------
-- 4. membership_subscriptions: users could INSERT a row with status='active'.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Users can create their own membership subscriptions" ON public.membership_subscriptions;
DROP POLICY IF EXISTS "Admins can update membership subscriptions" ON public.membership_subscriptions;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.membership_subscriptions FROM anon, authenticated;

-- ------------------------------------------------------------
-- 5. Tables created without RLS. With Supabase's default grants, anon and
--    authenticated could read/modify/delete them. Enable RLS (no policies =
--    deny all for client roles) and revoke client privileges. The service
--    role is unaffected.
-- ------------------------------------------------------------
ALTER TABLE public.venues         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_orders  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_tiers   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_reviews  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.squads         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tour_packages  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tour_bookings  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON
    public.venues,
    public.events,
    public.ticket_orders,
    public.ticket_tiers,
    public.deals,
    public.venue_reviews,
    public.squads,
    public.tour_packages,
    public.tour_bookings
FROM anon, authenticated;
