-- ============================================================
-- Migration: Booking, Squad Member and Forum Post RLS
-- Description: RLS policies for booking ownership, squad membership reads and forum post visibility/writes
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
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.is_squad_member(target_squad_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.squad_members
        WHERE squad_id = target_squad_id
          AND user_id = auth.uid()
          AND status = 'joined'
    );
$$;

REVOKE ALL ON FUNCTION public.is_squad_member(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_squad_member(UUID) TO authenticated;

-- bookings: users can read/update their own bookings; admins can read/update all.
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.bookings TO authenticated;

DROP POLICY IF EXISTS "Users and admins can read bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can create their own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users and admins can update bookings" ON public.bookings;

CREATE POLICY "Users and admins can read bookings"
ON public.bookings
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
    OR public.is_admin()
);

CREATE POLICY "Users can create their own bookings"
ON public.bookings
FOR INSERT
TO authenticated
WITH CHECK (
    user_id = auth.uid()
    OR public.is_admin()
);

CREATE POLICY "Users and admins can update bookings"
ON public.bookings
FOR UPDATE
TO authenticated
USING (
    user_id = auth.uid()
    OR public.is_admin()
)
WITH CHECK (
    user_id = auth.uid()
    OR public.is_admin()
);

-- squad_members: users can read members only for squads they participate in.
ALTER TABLE public.squad_members ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.squad_members TO authenticated;

DROP POLICY IF EXISTS "Users can read members of their squads" ON public.squad_members;

CREATE POLICY "Users can read members of their squads"
ON public.squad_members
FOR SELECT
TO authenticated
USING (
    public.is_admin()
    OR public.is_squad_member(squad_id)
);

-- forum_posts: approved posts are public; authenticated users write their own posts.
ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.forum_posts TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.forum_posts TO authenticated;

DROP POLICY IF EXISTS "Approved forum posts are publicly readable" ON public.forum_posts;
DROP POLICY IF EXISTS "Users can create their own forum posts" ON public.forum_posts;
DROP POLICY IF EXISTS "Users and admins can update forum posts" ON public.forum_posts;
DROP POLICY IF EXISTS "Users and admins can delete forum posts" ON public.forum_posts;

CREATE POLICY "Approved forum posts are publicly readable"
ON public.forum_posts
FOR SELECT
TO anon, authenticated
USING (
    is_approved = TRUE
    OR user_id = auth.uid()
    OR public.is_admin()
);

CREATE POLICY "Users can create their own forum posts"
ON public.forum_posts
FOR INSERT
TO authenticated
WITH CHECK (
    user_id = auth.uid()
    OR public.is_admin()
);

CREATE POLICY "Users and admins can update forum posts"
ON public.forum_posts
FOR UPDATE
TO authenticated
USING (
    user_id = auth.uid()
    OR public.is_admin()
)
WITH CHECK (
    user_id = auth.uid()
    OR public.is_admin()
);

CREATE POLICY "Users and admins can delete forum posts"
ON public.forum_posts
FOR DELETE
TO authenticated
USING (
    user_id = auth.uid()
    OR public.is_admin()
);
