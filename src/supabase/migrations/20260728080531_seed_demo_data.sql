INSERT INTO public.users (
        email,
        password_hash,
        display_name,
        full_name,
        phone,
        city,
        role,
        membership_tier,
        nightlife_passport_points
    )
VALUES (
        'admin@nightlife.vn',
        'hashed_password',
        'admin',
        'System Admin',
        '0900000000',
        'hcm',
        'admin',
        'black_card',
        5000
    ),
    (
        'owner@nightlife.vn',
        'hashed_password',
        'skybar_owner',
        'Sky Bar Owner',
        '0901111111',
        'hcm',
        'venue_owner',
        'night_pass',
        800
    ),
    (
        'user1@gmail.com',
        'hashed_password',
        'john',
        'John Nguyen',
        '0902222222',
        'hcm',
        'user',
        'free',
        150
    ),
    (
        'user2@gmail.com',
        'hashed_password',
        'anna',
        'Anna Tran',
        '0903333333',
        'hanoi',
        'user',
        'night_pass',
        600
    ) ON CONFLICT (email) DO NOTHING;
INSERT INTO public.venues (
        slug,
        owner_id,
        name,
        type,
        description,
        address,
        district,
        city,
        cover_charge,
        price_range,
        thumbnail_url,
        is_verified
    )
VALUES (
        'observatory-saigon',
        (
            SELECT id
            FROM public.users
            WHERE email = 'owner@nightlife.vn'
        ),
        'Observatory Saigon',
        'club',
        'Underground electronic music club',
        '85 Cach Mang Thang 8',
        'Q1',
        'hcm',
        200000,
        '$$$',
        'https://images.demo/club.jpg',
        TRUE
    ),
    (
        'chill-skybar',
        (
            SELECT id
            FROM public.users
            WHERE email = 'owner@nightlife.vn'
        ),
        'Chill Skybar',
        'rooftop_bar',
        'Luxury rooftop experience',
        '76A Le Lai',
        'Q1',
        'hcm',
        300000,
        '$$$$',
        'https://images.demo/skybar.jpg',
        TRUE
    ) ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.venue_tables (
        venue_id,
        table_name,
        type,
        capacity,
        min_spend,
        deposit_required
    )
VALUES (
        (
            SELECT id
            FROM public.venues
            WHERE slug = 'chill-skybar'
        ),
        'VIP Room 1',
        'vip',
        8,
        8000000,
        2000000
    ),
    (
        (
            SELECT id
            FROM public.venues
            WHERE slug = 'chill-skybar'
        ),
        'Table A1',
        'standard',
        4,
        2000000,
        500000
    ) ON CONFLICT DO NOTHING;
INSERT INTO public.events (
        slug,
        venue_id,
        title,
        description,
        event_date,
        start_time,
        genre,
        lineup,
        is_free,
        total_capacity
    )
VALUES (
        'edm-night-july',
        (
            SELECT id
            FROM public.venues
            WHERE slug = 'observatory-saigon'
        ),
        'EDM Friday Night',
        'International DJs',
        '2026-08-10',
        '20:00',
        ARRAY ['edm'],
        ARRAY ['DJ Snake','Local DJ'],
        FALSE,
        500
    ) ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.ticket_orders (
        user_id,
        event_id,
        total_amount,
        platform_fee,
        status
    )
VALUES (
        (
            SELECT id
            FROM public.users
            WHERE email = 'user1@gmail.com'
        ),
        (
            SELECT id
            FROM public.events
            WHERE slug = 'edm-night-july'
        ),
        500000,
        25000,
        'paid'
    ) ON CONFLICT DO NOTHING;
INSERT INTO public.ticket_tiers (
        event_id,
        name,
        price,
        quantity
    )
VALUES (
        (
            SELECT id
            FROM public.events
            WHERE slug = 'edm-night-july'
        ),
        'General',
        500000,
        500
    ) ON CONFLICT DO NOTHING;
INSERT INTO public.tickets (
        tier_id,
        event_id,
        user_id,
        order_id,
        ticket_code,
        status
    )
VALUES (
        (
            SELECT id
            FROM public.ticket_tiers
            WHERE name = 'General'
            LIMIT 1
        ), (
            SELECT id
            FROM public.events
            WHERE slug = 'edm-night-july'
        ),
        (
            SELECT id
            FROM public.users
            WHERE email = 'user1@gmail.com'
        ),
        (
            SELECT id
            FROM public.ticket_orders
            LIMIT 1
        ), 'QR000001', 'valid'
    ) ON CONFLICT (ticket_code) DO NOTHING;
INSERT INTO public.squads (
        invite_code,
        created_by,
        venue_id,
        booking_date,
        booking_time,
        party_size,
        budget_per_person
    )
VALUES (
        'ABC123',
        (
            SELECT id
            FROM public.users
            WHERE email = 'user1@gmail.com'
        ),
        (
            SELECT id
            FROM public.venues
            WHERE slug = 'chill-skybar'
        ),
        '2026-08-15',
        '21:00',
        6,
        1500000
    ) ON CONFLICT (invite_code) DO NOTHING;
INSERT INTO public.bookings (
        venue_id,
        table_id,
        user_id,
        squad_id,
        booking_date,
        booking_time,
        party_size,
        status
    )
SELECT (
        SELECT id
        FROM public.venues
        WHERE slug = 'chill-skybar'
    ),
    (
        SELECT id
        FROM public.venue_tables
        WHERE table_name = 'VIP Room 1'
        LIMIT 1
    ), (
        SELECT id
        FROM public.users
        WHERE email = 'user1@gmail.com'
    ),
    (
        SELECT id
        FROM public.squads
        WHERE invite_code = 'ABC123'
    ),
    '2026-08-15',
    '21:00',
    6,
    'confirmed'
WHERE NOT EXISTS (
        SELECT 1
        FROM public.bookings
        WHERE booking_date = '2026-08-15'
            AND booking_time = '21:00'
            AND user_id =(
                SELECT id
                FROM public.users
                WHERE email = 'user1@gmail.com'
            )
    );
INSERT INTO public.venue_reviews (
        venue_id,
        user_id,
        booking_id,
        rating,
        content,
        visited_date,
        is_verified_visit
    )
SELECT (
        SELECT id
        FROM public.venues
        WHERE slug = 'chill-skybar'
    ),
    (
        SELECT id
        FROM public.users
        WHERE email = 'user1@gmail.com'
    ),
    (
        SELECT id
        FROM public.bookings
        LIMIT 1
    ), 5, 'Amazing atmosphere and great music.', '2026-08-15', TRUE
WHERE NOT EXISTS (
        SELECT 1
        FROM public.venue_reviews
        WHERE user_id =(
                SELECT id
                FROM public.users
                WHERE email = 'user1@gmail.com'
            )
            AND venue_id =(
                SELECT id
                FROM public.venues
                WHERE slug = 'chill-skybar'
            )
    );