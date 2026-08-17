-- ============================================================
-- Migration: Create Users Table
-- Description: Users & Membership
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    display_name TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    phone TEXT,
    city TEXT DEFAULT 'hcm',
    role TEXT DEFAULT 'user',
    membership_tier TEXT DEFAULT 'free',
    membership_expires_at TIMESTAMPTZ,
    nightlife_passport_points INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE public.users IS 'Application users';