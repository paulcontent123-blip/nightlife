-- ============================================================
-- Migration: SEO Articles
-- Description: Blog/news articles managed by admins for SEO landing pages.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.seo_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    excerpt TEXT,
    content TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'guide',
    tags TEXT[] NOT NULL DEFAULT '{}',
    city TEXT,
    target_keyword TEXT,
    meta_title TEXT,
    meta_description TEXT,
    canonical_url TEXT,
    og_image_url TEXT,
    schema_type TEXT NOT NULL DEFAULT 'BlogPosting',
    status TEXT NOT NULL DEFAULT 'draft',
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    reading_time_minutes INTEGER NOT NULL DEFAULT 1,
    view_count INTEGER NOT NULL DEFAULT 0,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT seo_articles_status_check CHECK (
        status IN ('draft', 'published', 'archived')
    ),
    CONSTRAINT seo_articles_schema_type_check CHECK (
        schema_type IN ('BlogPosting', 'Article', 'NewsArticle')
    ),
    CONSTRAINT seo_articles_reading_time_check CHECK (
        reading_time_minutes > 0
    )
);

CREATE INDEX IF NOT EXISTS seo_articles_public_idx
ON public.seo_articles (published_at DESC)
WHERE status = 'published';

CREATE INDEX IF NOT EXISTS seo_articles_city_idx
ON public.seo_articles (city)
WHERE status = 'published';

CREATE INDEX IF NOT EXISTS seo_articles_category_idx
ON public.seo_articles (category)
WHERE status = 'published';

CREATE INDEX IF NOT EXISTS seo_articles_tags_idx
ON public.seo_articles USING GIN (tags);

CREATE OR REPLACE FUNCTION public.touch_seo_articles_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS seo_articles_touch_updated_at ON public.seo_articles;

CREATE TRIGGER seo_articles_touch_updated_at
BEFORE UPDATE ON public.seo_articles
FOR EACH ROW
EXECUTE FUNCTION public.touch_seo_articles_updated_at();

ALTER TABLE public.seo_articles ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.seo_articles TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.seo_articles TO authenticated;

DROP POLICY IF EXISTS "Published SEO articles are publicly readable" ON public.seo_articles;
DROP POLICY IF EXISTS "Admins can read all SEO articles" ON public.seo_articles;
DROP POLICY IF EXISTS "Admins can create SEO articles" ON public.seo_articles;
DROP POLICY IF EXISTS "Admins can update SEO articles" ON public.seo_articles;
DROP POLICY IF EXISTS "Admins can delete SEO articles" ON public.seo_articles;

CREATE POLICY "Published SEO articles are publicly readable"
ON public.seo_articles
FOR SELECT
TO anon, authenticated
USING (
    status = 'published'
    AND published_at IS NOT NULL
    AND published_at <= NOW()
);

CREATE POLICY "Admins can read all SEO articles"
ON public.seo_articles
FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE POLICY "Admins can create SEO articles"
ON public.seo_articles
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update SEO articles"
ON public.seo_articles
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete SEO articles"
ON public.seo_articles
FOR DELETE
TO authenticated
USING (public.is_admin());
