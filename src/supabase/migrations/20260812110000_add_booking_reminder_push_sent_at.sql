-- ============================================================
-- Migration: Booking Reminder Push
-- Description: Track whether the 3-hour booking reminder push was sent.
-- ============================================================

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS reminder_push_sent_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS bookings_confirmed_reminder_idx
ON public.bookings (booking_date, booking_time)
WHERE status = 'confirmed'
  AND reminder_push_sent_at IS NULL;
