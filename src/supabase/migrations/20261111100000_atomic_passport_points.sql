-- ============================================================
-- Migration: Atomic passport points
-- Description: Applies a passport point change (earn or redeem) in a single
-- transaction. The user row is locked FOR UPDATE, so concurrent requests for
-- the same user are serialized: a redeem can no longer pass the balance check
-- twice, and a duplicate award (same source) is returned instead of inserted.
-- Only the service role may call it; clients must not be able to award points.
-- ============================================================

CREATE OR REPLACE FUNCTION public.apply_passport_points(
    p_user_id UUID,
    p_points INTEGER,
    p_source_type TEXT,
    p_source_id TEXT,
    p_description TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_current INTEGER;
    v_next INTEGER;
    v_transaction public.passport_point_transactions%ROWTYPE;
BEGIN
    SELECT COALESCE(nightlife_passport_points, 0)
    INTO v_current
    FROM public.users
    WHERE id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'PASSPORT_USER_NOT_FOUND';
    END IF;

    -- Idempotent awards: the same source never applies twice.
    SELECT *
    INTO v_transaction
    FROM public.passport_point_transactions
    WHERE user_id = p_user_id
      AND source_type = p_source_type
      AND source_id = p_source_id;

    IF FOUND THEN
        RETURN jsonb_build_object(
            'applied', FALSE,
            'balance_before', v_current,
            'transaction', to_jsonb(v_transaction)
        );
    END IF;

    v_next := v_current + p_points;

    IF v_next < 0 THEN
        RAISE EXCEPTION 'PASSPORT_INSUFFICIENT_POINTS';
    END IF;

    INSERT INTO public.passport_point_transactions (
        user_id,
        points,
        balance_after,
        source_type,
        source_id,
        description
    )
    VALUES (
        p_user_id,
        p_points,
        v_next,
        p_source_type,
        p_source_id,
        p_description
    )
    RETURNING * INTO v_transaction;

    UPDATE public.users
    SET nightlife_passport_points = v_next
    WHERE id = p_user_id;

    RETURN jsonb_build_object(
        'applied', TRUE,
        'balance_before', v_current,
        'transaction', to_jsonb(v_transaction)
    );
END;
$$;

REVOKE ALL ON FUNCTION public.apply_passport_points(UUID, INTEGER, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_passport_points(UUID, INTEGER, TEXT, TEXT, TEXT) TO service_role;
