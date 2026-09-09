-- ============================================================
-- Migration: SEO Articles — related articles
-- Description: Lets an admin manually curate which other articles show in
-- the "Bài viết liên quan" section on an article's detail page, instead of
-- always relying on the automatic same-category suggestion.
-- ============================================================

ALTER TABLE public.seo_articles
ADD COLUMN IF NOT EXISTS related_article_ids UUID[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS seo_articles_related_ids_idx
ON public.seo_articles USING GIN (related_article_ids);
