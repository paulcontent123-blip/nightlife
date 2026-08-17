-- Prevent double-booking the same table at the same date/time while a booking is holding the slot.
CREATE UNIQUE INDEX IF NOT EXISTS bookings_unique_active_table_slot
ON public.bookings (table_id, booking_date, booking_time)
WHERE table_id IS NOT NULL
  AND status IN ('pending', 'confirmed', 'seated');
