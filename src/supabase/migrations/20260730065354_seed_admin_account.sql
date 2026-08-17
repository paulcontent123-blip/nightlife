INSERT INTO public.users (
        id,
        email,
        display_name,
        full_name,
        role,
        membership_tier,
        city,
        nightlife_passport_points
    )
SELECT id,
    email,
    'Administrator',
    'System Administrator',
    'admin',
    'black_card',
    'hcm',
    0
FROM auth.users
WHERE email = 'admin@nightlife.vn';