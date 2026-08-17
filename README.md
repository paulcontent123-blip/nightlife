# Nightlife.vn

Nightlife.vn la nen tang dat ban, xem venue/event, mua ve, membership, passport points, push notification va SEO content cho nightlife. Du an hien tai dung **Next.js App Router** lam frontend va backend API chung trong mot source code.

## 1. Tech Stack

- **Framework:** Next.js 15 App Router
- **Language:** TypeScript
- **Frontend:** React 19, Tailwind CSS
- **Backend:** Next.js Route Handlers under `/api/v1`
- **Database/Auth:** Supabase DB + Supabase Auth + RLS
- **Cache/Rate limit:** Upstash Redis REST
- **Images:** Cloudinary
- **Email:** Resend
- **Push:** Firebase Cloud Messaging
- **Cron/Scheduler:** Upstash QStash or external cron calling internal cron endpoint
- **Maps:** Google Maps Platform for geocode/place details when API key and billing are active
- **Deploy target:** Vercel for Next.js app

## 2. Current Scope

### Implemented Modules

- Auth + profile + Google OAuth callback
- Role based access: `user`, `admin`
- Venue CRUD, search, filter, nearby, availability
- Venue tables CRUD
- Deals / Happy Hour
- Events CRUD and public events
- Ticket tiers and ticket sales flow
- QR ticket check-in
- Booking flow: create, mine, cancel, admin confirm, check-in, complete
- Mock payment flow for VNPay/MoMo
- Membership subscribe and admin confirmation
- Passport points and rewards
- Forum posts, replies, reports, moderation
- Realtime channel metadata
- Push notifications with Firebase token registration
- Notification jobs and cron endpoint
- Bar Tour recommendation MVP
- SEO articles/news blog for `/bai-viet/*`

### Implemented Frontend Pages

Public:

- `/`
- `/login`
- `/register`
- `/venues`
- `/venues/[slug]`
- `/events`
- `/events/[slug]`
- `/happy-hour`
- `/forum`
- `/forum/[id]`
- `/membership`
- `/passport`
- `/notifications`
- `/bar-tour`
- `/bookings/mine`
- `/bookings/[id]`
- `/tickets/mine`
- `/bai-viet`
- `/bai-viet/[slug]`
- `/sitemap.xml`

Admin:

- `/admin/dashboard`
- `/admin/venues`
- `/admin/venues/new`
- `/admin/venues/[venueId]`
- `/admin/venues/[venueId]/events/[eventId]`
- `/admin/bookings`
- `/admin/bookings/[id]`
- `/admin/ticket-orders`
- `/admin/tickets/checkin`
- `/admin/membership`
- `/admin/passport`
- `/admin/forum/posts`
- `/admin/forum/posts/[id]`
- `/admin/forum/reports`
- `/admin/notifications`
- `/admin/bai-viet`
- `/admin/bai-viet/new`
- `/admin/bai-viet/[id]`

## 3. Project Structure

```txt
src/
  app/
    (site)/                 Public frontend pages
    admin/                  Admin frontend pages
    api/v1/                 Backend API route handlers
    sitemap.ts              Dynamic sitemap
  components/               Shared UI and feature components
  config/                   Env-based service config
  lib/
    api/                    API fetch helpers and view-model types
    cloudinary/             Cloudinary upload helpers
    firebase/               Browser Firebase helpers
    redis/                  Redis REST client helpers
    supabase/               Supabase clients
  modules/                  Business modules/services/repositories/validators
  supabase/
    migrations/             Supabase SQL migrations
```

## 4. Local Setup

Install dependencies:

```bash
npm install
```

Run dev server:

```bash
npm run dev
```

Open:

```txt
http://localhost:3000
```

Build check:

```bash
npm run build
```

Production start after build:

```bash
npm run start
```

## 5. Supabase Setup

Check migration status:

```bash
supabase migration list
```

Push migrations:

```bash
supabase db push
```

If a new table does not appear in PostgREST schema cache, run in Supabase SQL Editor:

```sql
NOTIFY pgrst, 'reload schema';
```

Important new table for SEO content:

```txt
seo_articles
```

If `/admin/bai-viet` returns:

```txt
Could not find the table 'public.seo_articles' in the schema cache
```

then the migration has not been applied to the current Supabase database or schema cache has not been reloaded.

## 6. Demo Accounts

Use these accounts for QA/demo after the database has been seeded or the accounts have been created in Supabase Auth.

```txt
Admin
email: admin@nightlife.vn
password: Admin@123456

User
email: standunder57@gmail.com
password: password123
```

## 7. Main API Endpoints

Base URL:

```txt
/api/v1
```

### Auth

```txt
POST /auth/register
POST /auth/login
POST /auth/logout
POST /auth/refresh
GET  /auth/me
GET  /auth/admin/me
PUT  /auth/profile
GET  /auth/google
GET  /auth/callback
```

### Venues

```txt
GET  /venues
GET  /venues/nearby
GET  /venues/:slug
GET  /venues/:slug/availability
GET  /venues/:slug/deals
GET  /venues/:slug/events
GET  /venues/:slug/reviews
POST /venues/:slug/reviews
GET  /venues/:slug/reviews/eligible
```

Admin:

```txt
GET    /admin/venues
POST   /admin/venues
GET    /admin/venues/:venueId
PATCH  /admin/venues/:venueId
DELETE /admin/venues/:venueId
POST   /admin/venues/:venueId/photos
```

### Venue Tables

```txt
POST   /admin/venues/:venueId/tables
PATCH  /admin/venues/:venueId/tables/:tableId
DELETE /admin/venues/:venueId/tables/:tableId
```

### Deals

```txt
GET /deals
GET /deals/venue/:venueId
```

Admin:

```txt
POST   /admin/venues/:venueId/deals
PATCH  /admin/venues/:venueId/deals/:dealId
DELETE /admin/venues/:venueId/deals/:dealId
```

### Events and Tickets

```txt
GET  /events
GET  /events/:slug
GET  /events/:slug/ticket-tiers
POST /events/:slug/purchase
GET  /tickets/mine
GET  /tickets/:code
POST /tickets/:code/checkin
```

Admin:

```txt
POST   /admin/venues/:venueId/events
PATCH  /admin/venues/:venueId/events/:eventId
DELETE /admin/venues/:venueId/events/:eventId

POST   /admin/events/:eventId/ticket-tiers
PATCH  /admin/ticket-tiers/:id
DELETE /admin/ticket-tiers/:id

GET  /admin/ticket-orders
POST /admin/ticket-orders/:id/confirm
```

### Bookings

```txt
POST /bookings
GET  /bookings/mine
GET  /bookings/:id
PUT  /bookings/:id/cancel
POST /bookings/:id/checkin
```

Admin:

```txt
GET  /admin/bookings
GET  /admin/bookings/:id
POST /admin/bookings/:id/confirm
POST /admin/bookings/:id/complete
```

### Payments

Current payment mode supports mock first and can be switched later when real credentials are available.

```txt
POST /payments/vnpay/create
POST /payments/vnpay/ipn
POST /payments/momo/create
POST /payments/momo/ipn
```

Current business rule from tech lead:

- Payment webhook marks payment as received.
- Admin confirms after reconciliation.
- Booking/ticket/membership is confirmed or issued after admin action.

### Membership

```txt
GET  /membership/tiers
POST /membership/subscribe
GET  /membership/mine
POST /membership/cancel
```

Admin:

```txt
GET  /admin/membership/subscriptions
POST /admin/membership/subscriptions/:id/confirm
POST /admin/membership/subscriptions/:id/reject
```

### Passport

```txt
GET  /passport/mine
GET  /passport/rewards
POST /passport/redeem
```

Admin:

```txt
GET /admin/passport/transactions
```

### Forum

```txt
GET  /forum/posts
POST /forum/posts
GET  /forum/posts/:id
POST /forum/posts/:id/replies
POST /forum/posts/:id/report
```

Admin:

```txt
GET   /admin/forum/posts
PATCH /admin/forum/posts/:id
GET   /admin/forum/reports
PATCH /admin/forum/reports/:id
```

### SEO Articles / News Blog

Public:

```txt
GET /bai-viet
GET /bai-viet/:slug
```

Admin:

```txt
GET    /admin/bai-viet
POST   /admin/bai-viet
GET    /admin/bai-viet/:id
PATCH  /admin/bai-viet/:id
DELETE /admin/bai-viet/:id
POST   /admin/bai-viet/images
```

Article content logic:

- `content` stores Markdown.
- Inline article images are uploaded to Cloudinary and inserted into content as Markdown:

```md
![alt text](https://res.cloudinary.com/.../image.jpg)
```

- `og_image_url` is separate and used as the SEO/Open Graph image.

### Notifications

```txt
POST /notifications/device-token
GET  /notifications/firebase/status
GET  /notifications/preferences
PATCH /notifications/preferences
POST /notifications/test-push
```

Cron:

```txt
POST /cron/notification-jobs
Authorization: Bearer {{CRON_SECRET}}
```

Admin utility:

```txt
POST /admin/notification-jobs/run
POST /admin/notifications/booking-reminders
```

### Realtime

```txt
GET /realtime/channels
```

### Bar Tour

```txt
GET /bar-tour/recommendations
```

## 8. Key Business Rules

### Auth

- Supabase Auth handles authentication.
- Next.js SSR/cookies are used to keep user session.
- Admin APIs require `role = admin`.

### Booking

Booking statuses:

```txt
pending -> confirmed -> seated -> completed
cancelled
no_show
```

Current flow:

1. User checks venue availability.
2. User creates booking.
3. If deposit is required, payment request is created.
4. Payment IPN marks deposit as received.
5. Admin confirms booking after reconciliation.
6. Admin/user check-in changes booking to seated.
7. Admin completes booking.
8. Check-in awards passport points.

### Ticket Sales

Current flow:

1. User selects tier and quantity.
2. Redis hold locks inventory for a short window.
3. User pays through mock VNPay/MoMo.
4. Payment received.
5. Admin confirms ticket order.
6. System creates tickets with QR codes.
7. Admin scans QR on event day.

### Membership

Current flow:

1. User subscribes to Night Pass or Black Card.
2. Payment request is created.
3. Payment received.
4. Admin confirms membership.
5. User profile membership tier is updated.

### Deals

Deals are currently public display/filter data, not direct payment coupons.

### SEO Articles

SEO article statuses:

```txt
draft
published
archived
```

Public users only see `published` articles.

## 9. Cache, Rate Limit, and Jobs

- Public API rate limit: Redis based.
- Booking API rate limit: Redis based.
- Venue list and availability cache are Redis based.
- Availability cache is invalidated when venue table/booking state changes.
- Notification jobs are stored and processed through cron endpoint.

## 10. Deployment to Vercel

1. Push code to GitHub.
2. Import repository in Vercel.
3. Set Framework Preset: Next.js.
4. Build command:

```bash
npm run build
```

5. Add all production environment variables.
6. Deploy.
7. Add custom domain:

```txt
nightlife.vn
www.nightlife.vn
```

8. Configure DNS at VietNix:

```txt
A     @     value from Vercel dashboard
CNAME www   value from Vercel dashboard
```

Do not delete MX/TXT/SPF/DKIM/DMARC records if VietNix is used for email.

9. Update Supabase Auth URL config:

```txt
Site URL:
https://nightlife.vn

Redirect URLs:
https://nightlife.vn/api/v1/auth/callback
https://www.nightlife.vn/api/v1/auth/callback
http://localhost:3000/api/v1/auth/callback
```

10. Update Google OAuth redirect URLs if Google login is enabled.

## 11. Smoke Test Checklist

After local setup or deployment:

- Open `/`
- Register/login user
- Login admin
- Open `/admin/dashboard`
- Create venue
- Upload venue photos
- Create venue table
- Check `/venues/:slug/availability`
- Create booking
- Trigger mock payment IPN
- Admin confirm booking
- Admin check-in booking
- Admin complete booking
- Create event
- Create ticket tier
- Purchase ticket
- Trigger mock payment IPN
- Admin confirm ticket order
- Open `/tickets/mine`
- Scan/check-in ticket QR
- Create Happy Hour deal
- Open `/happy-hour`
- Create forum post/reply/report
- Moderate forum as admin
- Subscribe membership
- Trigger mock membership payment IPN
- Admin confirm membership
- Check passport points/rewards
- Register notification device token
- Test push notification
- Create SEO article
- Upload inline article image
- Publish article
- Open `/bai-viet/:slug`
- Open `/sitemap.xml`

## 12. Known Production Notes

- Resend must verify a real domain before sending emails to real users.
- Google Maps backend geocode/place detail requires valid API key and billing.
- Payment currently supports mock/demo flow unless real VNPay/MoMo credentials are configured.
- QStash/cron should call production URL with `CRON_SECRET`.
- Supabase migrations must be applied before testing admin pages that use new tables.
- Vercel is recommended for the Next.js app. VietNix can remain domain/DNS/email hosting provider.

## 13. Useful Commands

```bash
npm install
npm run dev
npm run build
npm run start
supabase migration list
supabase db push
```
