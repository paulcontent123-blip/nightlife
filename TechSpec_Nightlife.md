# Nightlife.com.vn — Technical Specification
**Version:** 1.0 | **Date:** 2026 | **Stack:** Next.js 15 + Supabase + Redis + WebSocket

---

## 1. OVERVIEW

Nightlife.com.vn là nền tảng nightlife full-stack với 6 core features:
1. Venue discovery & booking (table/VIP room)
2. Events & ticket sales
3. Squad Night (group booking + bill splitting)
4. Happy Hour deals aggregator
5. Community forum (hỏi đáp đi bar)
6. VIP Membership (3 tiers)

---

## 2. DATABASE SCHEMA (Supabase / PostgreSQL)

### 2.1 Users & Membership
```sql
users (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email             TEXT UNIQUE NOT NULL,
  password_hash     TEXT,
  display_name      TEXT NOT NULL,
  full_name         TEXT,
  avatar_url        TEXT,
  phone             TEXT,
  city              TEXT DEFAULT 'hcm',    -- 'hcm' | 'hanoi' | 'danang'
  role              TEXT DEFAULT 'user',   -- 'user' | 'venue_owner' | 'admin'
  membership_tier   TEXT DEFAULT 'free',  -- 'free' | 'night_pass' | 'black_card'
  membership_expires_at TIMESTAMPTZ,
  nightlife_passport_points INTEGER DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT NOW()
)
```

### 2.2 Venues
```sql
venues (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug              TEXT UNIQUE NOT NULL,    -- 'observatory-saigon'
  owner_id          UUID REFERENCES users(id),
  name              TEXT NOT NULL,
  type              TEXT NOT NULL,           -- 'rooftop_bar' | 'club' | 'wine_bar' | 'live_music' | 'terrace' | 'lounge'
  description       TEXT,
  address           TEXT NOT NULL,
  district          TEXT,                    -- 'Q1' | 'Q2' | 'Q3'
  city              TEXT DEFAULT 'hcm',
  lat               DECIMAL(10,7),
  lng               DECIMAL(10,7),
  phone             TEXT,
  website           TEXT,
  instagram         TEXT,
  cover_charge      INTEGER DEFAULT 0,       -- VND, 0 = free entry
  price_range       TEXT DEFAULT '$$',       -- '$' | '$$' | '$$$' | '$$$$'
  capacity          INTEGER,
  min_spend         INTEGER,                 -- Minimum spend per table
  dress_code        TEXT,
  age_restriction   INTEGER DEFAULT 18,
  open_hours        JSONB,                   -- {"mon": "18:00-02:00", "fri": "18:00-04:00"}
  features          TEXT[],                  -- ['live_dj', 'live_band', 'pool', 'outdoor']
  thumbnail_url     TEXT,
  images            TEXT[],
  is_verified       BOOLEAN DEFAULT FALSE,
  is_active         BOOLEAN DEFAULT TRUE,
  is_vip_only       BOOLEAN DEFAULT FALSE,
  avg_rating        DECIMAL(3,2),
  total_reviews     INTEGER DEFAULT 0,
  total_bookings    INTEGER DEFAULT 0,
  subscription_tier TEXT DEFAULT 'basic',   -- 'basic' | 'premium' (B2B plan)
  created_at        TIMESTAMPTZ DEFAULT NOW()
)

venue_tables (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id          UUID REFERENCES venues(id) ON DELETE CASCADE,
  table_name        TEXT NOT NULL,           -- 'VIP Room 1' | 'Table A3'
  type              TEXT DEFAULT 'standard', -- 'standard' | 'vip' | 'booth'
  capacity          SMALLINT NOT NULL,
  min_spend         INTEGER,
  deposit_required  INTEGER DEFAULT 0,
  is_active         BOOLEAN DEFAULT TRUE
)
```

### 2.3 Bookings
```sql
bookings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id          UUID REFERENCES venues(id),
  table_id          UUID REFERENCES venue_tables(id),
  user_id           UUID REFERENCES users(id),
  squad_id          UUID REFERENCES squads(id),     -- null nếu book cá nhân
  booking_date      DATE NOT NULL,
  booking_time      TIME NOT NULL,
  party_size        SMALLINT NOT NULL,
  status            TEXT DEFAULT 'pending',          -- 'pending'|'confirmed'|'seated'|'completed'|'cancelled'|'no_show'
  special_requests  TEXT,
  deposit_amount    INTEGER DEFAULT 0,
  deposit_paid      BOOLEAN DEFAULT FALSE,
  payment_ref       TEXT,
  confirmed_at      TIMESTAMPTZ,
  cancelled_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
)
```

### 2.4 Events & Tickets
```sql
events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug              TEXT UNIQUE NOT NULL,
  venue_id          UUID REFERENCES venues(id),
  title             TEXT NOT NULL,
  description       TEXT,
  event_date        DATE NOT NULL,
  start_time        TIME NOT NULL,
  end_time          TIME,
  genre             TEXT[],                  -- ['edm', 'hip_hop', 'jazz']
  lineup            TEXT[],                  -- ['DJ Tiesto', 'Local DJ']
  thumbnail_url     TEXT,
  images            TEXT[],
  is_free           BOOLEAN DEFAULT FALSE,
  age_restriction   INTEGER DEFAULT 18,
  total_capacity    INTEGER,
  is_active         BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMPTZ DEFAULT NOW()
)

ticket_tiers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id          UUID REFERENCES events(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,           -- 'Early Bird' | 'General' | 'VIP'
  price             INTEGER NOT NULL,        -- VND
  quantity          INTEGER NOT NULL,        -- Số lượng vé loại này
  sold              INTEGER DEFAULT 0,
  includes          TEXT[],                  -- ['1 welcome drink', 'priority entry']
  sale_starts_at    TIMESTAMPTZ,
  sale_ends_at      TIMESTAMPTZ
)

tickets (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_id           UUID REFERENCES ticket_tiers(id),
  event_id          UUID REFERENCES events(id),
  user_id           UUID REFERENCES users(id),
  order_id          UUID,
  ticket_code       TEXT UNIQUE NOT NULL,    -- QR code value
  status            TEXT DEFAULT 'valid',   -- 'valid' | 'used' | 'refunded'
  checked_in_at     TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
)

ticket_orders (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES users(id),
  event_id          UUID REFERENCES events(id),
  total_amount      INTEGER NOT NULL,
  platform_fee      INTEGER NOT NULL,        -- 5% ticketing fee
  status            TEXT DEFAULT 'pending', -- 'pending'|'paid'|'refunded'
  payment_method    TEXT,
  payment_ref       TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
)
```

### 2.5 Squad Night
```sql
squads (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_code       TEXT UNIQUE NOT NULL,    -- 6-char code để share
  created_by        UUID REFERENCES users(id),
  venue_id          UUID REFERENCES venues(id),
  booking_date      DATE,
  booking_time      TIME,
  party_size        SMALLINT,
  budget_per_person INTEGER,
  status            TEXT DEFAULT 'forming', -- 'forming'|'confirmed'|'completed'
  bill_splitting    BOOLEAN DEFAULT TRUE,
  total_bill        INTEGER,
  created_at        TIMESTAMPTZ DEFAULT NOW()
)

squad_members (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id          UUID REFERENCES squads(id) ON DELETE CASCADE,
  user_id           UUID REFERENCES users(id),
  role              TEXT DEFAULT 'member',  -- 'host' | 'member'
  status            TEXT DEFAULT 'invited',-- 'invited'|'confirmed'|'declined'
  share_amount      INTEGER,               -- phần thanh toán của người này
  paid              BOOLEAN DEFAULT FALSE,
  joined_at         TIMESTAMPTZ DEFAULT NOW()
)
```

### 2.6 Happy Hour Deals
```sql
deals (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id          UUID REFERENCES venues(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,           -- 'House Cocktail -50%'
  description       TEXT,
  discount_type     TEXT,                   -- 'percent' | 'fixed' | 'b1g1' | 'free_entry'
  discount_value    INTEGER,               -- 50 nếu percent, 50000 nếu fixed
  applicable_days   TEXT[],                -- ['mon','tue','wed','thu','fri','sat','sun']
  start_time        TIME NOT NULL,
  end_time          TIME NOT NULL,
  conditions        TEXT,                  -- 'Áp dụng khi đặt bàn trước qua Nightlife.vn'
  is_exclusive      BOOLEAN DEFAULT FALSE, -- chỉ dành cho VIP member
  is_active         BOOLEAN DEFAULT TRUE,
  valid_until       DATE,
  created_at        TIMESTAMPTZ DEFAULT NOW()
)
```

### 2.7 Community Forum
```sql
forum_posts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES users(id),
  title             TEXT NOT NULL,
  content           TEXT NOT NULL,
  city              TEXT,
  tags              TEXT[],                -- ['rooftop', 'Q1', 'group', 'review']
  venue_id          UUID REFERENCES venues(id),  -- nếu review cụ thể 1 venue
  is_pinned         BOOLEAN DEFAULT FALSE,
  is_approved       BOOLEAN DEFAULT TRUE,
  view_count        INTEGER DEFAULT 0,
  reply_count       INTEGER DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT NOW()
)

forum_replies (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id           UUID REFERENCES forum_posts(id) ON DELETE CASCADE,
  user_id           UUID REFERENCES users(id),
  parent_id         UUID REFERENCES forum_replies(id), -- nested reply
  content           TEXT NOT NULL,
  is_approved       BOOLEAN DEFAULT TRUE,
  helpful_count     INTEGER DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT NOW()
)
```

### 2.8 Bar Tour (ĐNA Packages)
```sql
tour_packages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug              TEXT UNIQUE NOT NULL,
  country           TEXT NOT NULL,           -- 'thailand' | 'indonesia' | 'singapore'
  city              TEXT NOT NULL,           -- 'Bangkok' | 'Bali' | 'Singapore'
  title             TEXT NOT NULL,
  description       TEXT,
  duration_days     SMALLINT NOT NULL,
  price_per_person  INTEGER NOT NULL,
  includes          TEXT[],                 -- ['khách sạn 4*', '3 venues']
  highlights        TEXT[],                 -- Tên các venues nổi bật
  thumbnail_url     TEXT,
  images            TEXT[],
  max_group_size    SMALLINT DEFAULT 10,
  is_active         BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMPTZ DEFAULT NOW()
)

tour_bookings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id        UUID REFERENCES tour_packages(id),
  user_id           UUID REFERENCES users(id),
  travel_date       DATE,
  group_size        SMALLINT DEFAULT 1,
  total_amount      INTEGER,
  status            TEXT DEFAULT 'inquiry', -- 'inquiry'|'confirmed'|'cancelled'
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
)
```

### 2.9 Venue Reviews
```sql
venue_reviews (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id          UUID REFERENCES venues(id) ON DELETE CASCADE,
  user_id           UUID REFERENCES users(id),
  booking_id        UUID REFERENCES bookings(id),  -- verify đã đến
  rating            SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  atmosphere_rating SMALLINT,
  service_rating    SMALLINT,
  value_rating      SMALLINT,
  content           TEXT,
  visited_date      DATE,
  images            TEXT[],
  is_verified_visit BOOLEAN DEFAULT FALSE,
  helpful_count     INTEGER DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT NOW()
)
```

---

## 3. API ENDPOINTS

### Base URL: `/api/v1`

### 3.1 Auth
```
POST   /auth/register
POST   /auth/login
POST   /auth/logout
POST   /auth/refresh
GET    /auth/me
PUT    /auth/profile           -- Cập nhật profile + avatar
```

### 3.2 Venues
```
GET    /venues                 -- Danh sách venues
  Query params:
    city=hcm
    type=rooftop_bar
    district=Q1
    price_range=$$
    features=live_dj
    is_open_now=true           -- Filter đang mở cửa
    sort=rating|popular|newest
    page=1&limit=20

GET    /venues/:slug           -- Chi tiết venue + tables + deals + reviews
GET    /venues/:slug/availability
  Query: date=2026-05-24&party_size=4
  Response: available tables + time slots

GET    /venues/:slug/reviews   -- Reviews của venue
POST   /venues/:slug/reviews   -- Tạo review (cần auth + verified booking)
GET    /venues/nearby          -- Venues gần vị trí hiện tại
  Query: lat=10.77&lng=106.69&radius=2000
```

### 3.3 Bookings
```
POST   /bookings               -- Tạo booking
  Body: {
    venue_id, table_id, booking_date, booking_time,
    party_size, special_requests, payment_method
  }

GET    /bookings/mine          -- Bookings của tôi
GET    /bookings/:id           -- Chi tiết booking
PUT    /bookings/:id/cancel    -- Huỷ booking (nếu > 2h trước)
POST   /bookings/:id/checkin   -- Venue check-in (venue owner)
```

### 3.4 Events & Tickets
```
GET    /events                 -- Danh sách events
  Query: city=hcm&date_from=2026-05-01&genre=edm

GET    /events/:slug           -- Chi tiết event + ticket tiers
POST   /events/:slug/purchase  -- Mua vé
  Body: { tier_id, quantity, payment_method }

GET    /tickets/mine           -- Vé của tôi
GET    /tickets/:code          -- Xem vé (dùng cho QR scan)
POST   /tickets/:code/checkin  -- Venue scan QR check-in
```

### 3.5 Squad Night
```
POST   /squads                 -- Tạo squad mới
  Body: { venue_id, booking_date, booking_time, party_size, budget_per_person }
  Response: { squad_id, invite_code, invite_url }

GET    /squads/:invite_code    -- Xem thông tin squad (public để share)
POST   /squads/:invite_code/join -- Tham gia squad
PUT    /squads/:id/confirm     -- Host confirm → tạo booking
POST   /squads/:id/split-bill  -- Tính toán chia bill
  Body: { total_amount }
  Response: { per_person_amount, payment_links }

POST   /squads/:id/pay         -- Từng member thanh toán phần của mình
GET    /squads/mine            -- Squads của tôi (host + member)
```

### 3.6 Deals
```
GET    /deals                  -- Danh sách Happy Hour deals active hôm nay
  Query: city=hcm&district=Q1&is_open_now=true

GET    /deals/venue/:venue_id  -- Deals của 1 venue cụ thể
```

### 3.7 Forum
```
GET    /forum/posts            -- Danh sách posts
  Query: city=hcm&tag=rooftop&sort=hot|new|top

POST   /forum/posts            -- Tạo post mới (cần auth)
GET    /forum/posts/:id        -- Chi tiết post + replies
POST   /forum/posts/:id/replies -- Trả lời
POST   /forum/posts/:id/report  -- Báo cáo
```

### 3.8 Membership
```
GET    /membership/tiers       -- Thông tin 3 gói VIP
POST   /membership/subscribe   -- Đăng ký VIP
  Body: { tier: 'night_pass' | 'black_card', payment_method }

GET    /membership/mine        -- Thông tin gói hiện tại
POST   /membership/cancel      -- Huỷ auto-renewal
```

### 3.9 Passport & Gamification
```
POST   /passport/checkin       -- Check-in tại venue (tích điểm)
  Body: { venue_id, booking_id }

GET    /passport/mine          -- Điểm + lịch sử check-in
GET    /passport/rewards       -- Danh sách rewards có thể đổi
POST   /passport/redeem        -- Đổi điểm lấy rewards
```

### 3.10 Bar Tours
```
GET    /tours                  -- Danh sách tour packages
GET    /tours/:slug            -- Chi tiết tour
POST   /tours/:slug/inquiry    -- Gửi yêu cầu đặt tour
```

### 3.11 Payments & Webhooks
```
POST   /payments/vnpay/create
POST   /payments/vnpay/ipn     -- WEBHOOK (không cần auth)
POST   /payments/momo/create
POST   /payments/momo/ipn      -- WEBHOOK (không cần auth)
POST   /payments/stripe/create -- Cho khách nước ngoài
POST   /payments/stripe/webhook -- WEBHOOK
```

---

## 4. BUSINESS LOGIC

### 4.1 Booking Flow
```
1. User chọn venue + ngày giờ + số người
2. API check availability → trả về available tables
3. User chọn bàn + điền thông tin
4. Nếu có deposit → redirect payment → webhook confirm
5. Booking status: pending → confirmed (sau payment / sau venue confirm)
6. Venue nhận notification (email + push) để chuẩn bị
7. User nhận confirmation email + calendar invite
8. Ngày đi: venue check-in → passport points +10
9. 24h sau → reminder email để review
```

### 4.2 Squad Night Flow
```
1. Host tạo squad → nhận invite_code (6 ký tự)
2. Host share link: nightlife.vn/squad/ABC123
3. Bạn bè click link → đăng nhập → join squad
4. Khi đủ người (hoặc host quyết định) → host confirm
5. System tạo booking tự động với party_size = số member
6. Chia bill:
   - Host nhập total_bill sau khi đi về
   - System tính per_person = total / members
   - Mỗi người nhận payment link (VNPay/MoMo)
   - Mark paid khi webhook confirm
7. Tích điểm Passport cho cả squad
```

### 4.3 Ticket Sales Flow
```
1. User chọn tier + quantity
2. Check inventory: tier.quantity - tier.sold >= quantity
3. Tạo order → lock seats (5 phút để thanh toán)
4. Redirect payment
5. Webhook confirm → generate ticket codes (UUID-based QR)
6. Email vé PDF với QR code
7. Ngày event: venue scan QR → API validate → mark checked_in
```

### 4.4 VIP Membership Perks
```
Night Pass (199k/tháng):
  - Priority booking: thấy availability 48h trước free users
  - Exclusive deals: access deals is_exclusive = TRUE
  - Free cover charge: 2 vouchers/tháng (cộng vào membership)
  - Squad discount: -20% khi party_size >= 4

Black Card (499k/tháng):
  - Tất cả Night Pass perks
  - Guaranteed VIP table: nếu không còn thì venue phải offer alternative
  - Concierge hotline: số điện thoại riêng để book 24/7
  - Unlimited free cover charge
  - Bar Tour discount: -15% tất cả packages
```

### 4.5 Passport Points System
```
Earn points:
  - Check-in tại venue:          +10 points
  - Review sau khi đến:          +5 points
  - Đặt vé event:                +15 points
  - Squad Night (cả nhóm):       +20 points host, +10 points members
  - Giới thiệu bạn đăng ký:      +50 points

Redeem rewards:
  - 100 points  → 1 free drink voucher
  - 300 points  → free cover charge 1 venue
  - 500 points  → 1 tháng Night Pass
  - 1000 points → 1 tháng Black Card
```

---

## 5. REALTIME FEATURES (Supabase Realtime)

```javascript
// 1. Live venue availability — cập nhật khi có booking mới
supabase
  .channel('venue-availability')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'bookings',
    filter: `venue_id=eq.${venueId}`
  }, payload => {
    // Update available tables count on UI
  })

// 2. Squad real-time updates — member join/leave
supabase
  .channel(`squad-${squadId}`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'squad_members',
    filter: `squad_id=eq.${squadId}`
  }, payload => {
    // Update member list + bill calculation
  })

// 3. Live event checkin count (cho venue staff)
supabase
  .channel(`event-${eventId}-checkins`)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'tickets',
    filter: `event_id=eq.${eventId}`
  }, payload => {
    // Update checkin counter for venue staff app
  })
```

---

## 6. AUTH & SECURITY

```
Authentication:   JWT (access 15 phút + refresh 30 ngày)
Social login:     Google OAuth (nhiều user nightlife dùng Google)

Rate limits:
  - Booking API: 10 req/min per user (tránh spam đặt bàn)
  - Forum post:  5 posts/hour per user
  - Public API:  100 req/min per IP

Row Level Security:
  - bookings:       chỉ đọc/sửa của mình hoặc venue_owner
  - squad_members:  chỉ đọc squad mình tham gia
  - forum_posts:    read all (approved), write của mình
  - venue tables:   read all, write chỉ venue_owner

Venue owner permissions:
  - Quản lý tables, deals, events của venue mình
  - Xem bookings của venue mình
  - Check-in bookings và scan QR vé
  - KHÔNG được đọc personal data của user
```

---

## 7. THIRD-PARTY INTEGRATIONS

| Service | Mục đích | Ghi chú |
|---------|----------|---------|
| Supabase | DB + Auth + Storage + Realtime | Primary |
| Redis (Upstash) | Cache venue list, deals, availability | TTL 5 phút cho availability |
| VNPay | Thanh toán booking + vé + squad | Phổ biến nhất VN |
| MoMo | Ví điện tử | Tiện cho thanh toán nhanh |
| Stripe | Khách nước ngoài (expat) | Card payment |
| Cloudinary | Image CDN | Venue photos |
| Resend | Email confirm + vé PDF | |
| Firebase Cloud Messaging | Push notification | Reminder, squad updates |
| Google Maps API | Venue map, nearby search | |
| BookingModel API | DJ/Talent booking từ venue | Internal VEA API |
| VEA Retail API | Ticket sales channel | Internal VEA API |

---

## 8. SEO REQUIREMENTS

```
/                                  → Trang chủ
/venue/[slug]                      → LocalBusiness schema + Review schema
/event/[slug]                      → Event schema (schema.org/Event)
/bai-viet/[slug]                   → Blog posts cho SEO
/[city]/bar                        → "bar Q1 hcm" local SEO
/[city]/club                       → "club saigon" local SEO
/[city]/happy-hour                 → "happy hour saigon" keyword

Dynamic sitemap:
  - /venue/* (2800+ URLs)
  - /event/* (120+ mỗi tháng)
  - /bai-viet/*

Google My Business integration:
  - Sync venue data với Google Business API
  - Import reviews 2 chiều
```

---

## 9. NOTIFICATIONS

```
Booking confirmed     → Email + Push
Booking reminder      → Push (3h trước)
Squad member joined   → Push realtime
Squad bill ready      → Push + Email với payment link
Event starts tomorrow → Push
Happy Hour starting   → Push (15 phút trước, opt-in)
New forum reply       → Push
Passport milestone    → Push (100, 300, 500, 1000 points)
Membership expiring   → Email (7 ngày trước)
```

---

## 10. INFRASTRUCTURE

```
Frontend:     Vercel (Next.js) — Vietnam Edge Network
Database:     Supabase Pro — Singapore region
Cache:        Upstash Redis — Singapore region
Images:       Cloudinary
Push:         Firebase Cloud Messaging (FCM)
Email:        Resend
Maps:         Google Maps Platform

Environment variables:
  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_ANON_KEY
  SUPABASE_SERVICE_ROLE_KEY
  REDIS_URL
  VNPAY_TMN_CODE
  VNPAY_HASH_SECRET
  MOMO_PARTNER_CODE
  MOMO_ACCESS_KEY
  MOMO_SECRET_KEY
  STRIPE_SECRET_KEY
  STRIPE_WEBHOOK_SECRET
  CLOUDINARY_URL
  RESEND_API_KEY
  FIREBASE_SERVICE_ACCOUNT
  GOOGLE_MAPS_API_KEY
  NEXT_PUBLIC_SITE_URL
```

---

## 11. ESTIMATED TIMELINE

| Phase | Tasks | Estimate |
|-------|-------|----------|
| 1 | Setup + schema migration + seed data | 2 ngày |
| 2 | Auth + user profile + Google OAuth | 2 ngày |
| 3 | Venue CRUD + search + filter + maps | 4 ngày |
| 4 | Booking system + availability check | 3 ngày |
| 5 | Payment integration (VNPay + MoMo) | 3 ngày |
| 6 | Events + ticket sales + QR checkin | 4 ngày |
| 7 | Squad Night + bill splitting | 3 ngày |
| 8 | Happy Hour deals system | 1 ngày |
| 9 | Forum community | 2 ngày |
| 10 | VIP Membership + Passport points | 3 ngày |
| 11 | Realtime (Supabase Realtime) | 2 ngày |
| 12 | Push notifications (FCM) | 2 ngày |
| 13 | Bar Tour module | 2 ngày |
| 14 | Venue owner dashboard | 3 ngày |
| 15 | SEO + sitemap + schema markup | 2 ngày |
| 16 | Testing + QA + deploy | 3 ngày |
| **Total** | | **~41 ngày** |
