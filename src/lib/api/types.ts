// Hand-written view-model types matching the JSON actually returned by the
// API's *.mapper.ts functions (nested shapes) — NOT the internal DB-row
// `*.types.ts` interfaces, which are a different shape. Enums/DTOs that ARE
// identical between the two are re-exported from the module type files below.

export type {
    VenueType,
    VenuePriceRange,
    VenueCity,
    VenueSubscriptionTier,
    CreateVenueDTO,
    UpdateVenueDTO,
    VenueListQuery,
    VenueAvailabilityResult,
} from "@/modules/venues/venue.types";

export type {
    BookingStatus,
    BookingPaymentMethod,
} from "@/modules/bookings/booking.types";

export type {
    UserProfile,
    UserRole,
    AuthResponse,
    RegisterDTO,
    LoginDTO,
} from "@/modules/auth/auth.types";

export type {
    CreateVenueTableDTO,
    UpdateVenueTableDTO,
} from "@/modules/venue-tables/venue-table.types";

export type {
    CreateEventDTO,
    UpdateEventDTO,
} from "@/modules/events/event.types";

export type {
    CreateTicketTierDTO,
    UpdateTicketTierDTO,
} from "@/modules/ticket-tiers/ticket-tier.types";

export type {
    TicketOrderStatus,
    TicketStatus,
} from "@/modules/ticket-sales/ticket-sales.types";

export type { PaymentProvider } from "@/modules/payments/payment.types";

export type {
    MembershipTierKey,
    PaidMembershipTierKey,
    MembershipPaymentMethod,
    MembershipSubscriptionStatus,
    MembershipPerks,
    MembershipTier,
} from "@/modules/membership/membership.types";

export type {
    PassportPointSourceType,
    PassportRewardType,
    PassportReward,
} from "@/modules/passport/passport.types";

export type {
    ForumSort,
    ForumModerationStatus,
    ForumReportStatus,
    CreateForumPostDTO,
    CreateForumReplyDTO,
    ReportForumPostDTO,
} from "@/modules/forums/forum.types";

export type {
    ArticleCategory,
    ArticleSchemaType,
    ArticleStatus,
    CreateArticleDTO,
    UpdateArticleDTO,
} from "@/modules/articles/article.types";

export type { PushPlatform } from "@/modules/notifications/tokens/push-token.types";

export type { EligibleReviewBooking } from "@/modules/venue-reviews/venue-review.types";

import type { VenuePriceRange, VenueSubscriptionTier, VenueType } from "@/modules/venues/venue.types";
import type { BookingPaymentMethod, BookingStatus } from "@/modules/bookings/booking.types";
import type { TicketOrderStatus, TicketStatus } from "@/modules/ticket-sales/ticket-sales.types";
import type {
    MembershipPaymentMethod,
    MembershipPerks,
    MembershipSubscriptionStatus,
    MembershipTier,
    MembershipTierKey,
    PaidMembershipTierKey,
} from "@/modules/membership/membership.types";
import type { PassportPointSourceType, PassportReward } from "@/modules/passport/passport.types";
import type { ForumReportStatus } from "@/modules/forums/forum.types";
import type { PushPlatform } from "@/modules/notifications/tokens/push-token.types";
import type { ArticleCategory, ArticleSchemaType, ArticleStatus } from "@/modules/articles/article.types";

export interface Pagination {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
}

export interface Paginated<T> {
    items: T[];
    pagination: Pagination;
}

export interface Venue {
    id: string;
    slug: string;
    name: string;
    type: VenueType;
    description: string | null;
    address: string;
    district: string | null;
    city: string;
    location: { lat: number | null; lng: number | null };
    contact: { phone: string | null; website: string | null; instagram: string | null };
    pricing: {
        cover_charge: number;
        price_range: VenuePriceRange;
        capacity: number | null;
        min_spend: number | null;
        dress_code: string | null;
        age_restriction: number;
    };
    operations: {
        open_hours: Record<string, string> | null;
        is_vip_only: boolean;
        subscription_tier: VenueSubscriptionTier;
    };
    features: string[];
    media: { thumbnail_url: string | null; images: string[] };
    status: { is_verified: boolean; is_active: boolean };
    metrics: { avg_rating: number | null; total_reviews: number; total_bookings: number };
    created_at: string;
}

export interface VenueTable {
    id: string;
    table_name: string;
    type: string;
    capacity: number;
    min_spend: number | null;
    deposit_required: number;
    is_active?: boolean;
}

export interface VenueDeal {
    id: string;
    title: string;
    description: string | null;
    discount_type: string | null;
    discount_value: number | null;
    applicable_days: string[];
    start_time: string;
    end_time: string;
    conditions: string | null;
    is_exclusive: boolean;
    valid_until: string | null;
    created_at: string;
}

export interface VenueReview {
    id: string;
    rating: number;
    atmosphere_rating: number | null;
    service_rating: number | null;
    value_rating: number | null;
    content: string | null;
    visited_date: string | null;
    images: string[];
    is_verified_visit: boolean;
    helpful_count: number;
    created_at: string;
}

export interface VenueDetail extends Venue {
    tables: VenueTable[];
    deals: VenueDeal[];
    reviews: VenueReview[];
}

export interface Booking {
    id: string;
    venue_id: string;
    table_id: string | null;
    user_id: string;
    booking_date: string;
    booking_time: string;
    party_size: number;
    status: BookingStatus;
    special_requests: string | null;
    deposit: { amount: number; paid: boolean };
    payment_ref: string | null;
    confirmed_at: string | null;
    cancelled_at: string | null;
    reminder_push_sent_at?: string | null;
    created_at: string;
    payment_method?: BookingPaymentMethod | null;
}

export interface CreatePaymentResult {
    provider: "vnpay" | "momo";
    mode: "mock" | "sandbox" | "production";
    booking_id: string;
    amount: number;
    payment_ref: string;
    payment_url: string;
    note: string;
}

export interface PaymentIpnResult {
    provider: string;
    booking: Booking;
    idempotent: boolean;
    status?: string;
    message: string;
}

export interface Event {
    id: string;
    slug: string;
    venue_id: string;
    title: string;
    description: string | null;
    event_date: string;
    start_time: string;
    end_time: string | null;
    genre: string[];
    lineup: string[];
    media: { thumbnail_url: string | null; images: string[] };
    is_free: boolean;
    age_restriction: number;
    total_capacity: number | null;
    is_active: boolean;
    created_at: string;
}

export interface TicketTier {
    id: string;
    event_id: string;
    name: string;
    price: number;
    quantity: number;
    sold: number;
    available: number;
    includes: string[];
    sale_starts_at: string | null;
    sale_ends_at: string | null;
}

export interface TicketOrder {
    id: string;
    user_id: string;
    event_id: string;
    total_amount: number;
    platform_fee: number;
    status: TicketOrderStatus;
    payment_method: string | null;
    payment_ref: string | null;
    created_at: string;
}

export interface Ticket {
    id: string;
    tier_id: string;
    event_id: string;
    user_id: string;
    order_id: string;
    ticket_code: string;
    qr_code: string;
    qr_url: string;
    status: TicketStatus;
    checked_in_at: string | null;
    created_at: string;
    event?: {
        slug: string;
        title: string;
        event_date: string;
        start_time: string;
        thumbnail_url: string | null;
    };
}

export interface PurchaseTicketsResult {
    hold: { id: string; status: "held"; payment_ref: string; created_at: string; expires_at: string };
    event: { id: string; slug: string; title: string };
    tier: { id: string; name: string; price: number };
    quantity: number;
    inventory: { total: number; sold: number; locked: number; available_after_lock: number };
    lock: { minutes: number; expires_at: string; storage: string };
    payment: {
        required: boolean;
        provider: "vnpay" | "momo";
        amount: number;
        payment_ref: string;
        payment_url: string;
    };
    next_step: string;
    note: string;
}

export interface TicketOrderPaymentResult {
    provider: string;
    order?: TicketOrder;
    hold?: { id: string; expires_at: string };
    quantity?: number;
    idempotent?: boolean;
    status: string;
    persisted_order_status?: TicketOrderStatus;
    message: string;
}

export interface ConfirmTicketOrderResult {
    order: TicketOrder;
    tickets: Ticket[];
    issued_count: number;
    idempotent: boolean;
    email_status: string;
}

export interface MembershipTiersResult {
    items: MembershipTier[];
    payment_required_tiers: PaidMembershipTierKey[];
    note: string;
}

export interface MembershipSubscription {
    id: string;
    user_id: string;
    tier: PaidMembershipTierKey;
    amount: number;
    status: MembershipSubscriptionStatus;
    payment_method: MembershipPaymentMethod;
    payment_ref: string;
    starts_at: string | null;
    expires_at: string | null;
    auto_renewal: boolean;
    confirmed_at: string | null;
    cancelled_at: string | null;
    created_at: string;
}

export interface MembershipMineResult {
    user: { id: string; email: string; display_name: string };
    membership: {
        tier: MembershipTierKey;
        stored_tier: string;
        status: "free" | "active" | "expired";
        expires_at: string | null;
        auto_renewal: boolean | null;
        pending_confirmation: boolean;
        perks: MembershipPerks;
    };
    passport: { points: number };
    pending_subscription: MembershipSubscription | null;
    active_subscription: MembershipSubscription | null;
}

export interface SubscribeMembershipResult {
    subscription: MembershipSubscription;
    payment: {
        provider: MembershipPaymentMethod;
        mode: "mock" | "sandbox" | "production";
        purpose: "membership";
        amount: number;
        payment_ref: string;
        payment_url: string;
        note: string;
    };
    reused_pending_subscription: boolean;
    next_step: string;
}

export interface PassportTransaction {
    id: string;
    user_id: string;
    points: number;
    balance_after: number;
    source_type: PassportPointSourceType;
    source_id: string;
    description: string | null;
    created_at: string;
}

export interface PassportMineResult {
    points: number;
    history: Paginated<PassportTransaction>;
    checkins: PassportTransaction[];
}

export interface PassportRewardsResult {
    points: number;
    items: Array<PassportReward & { redeemable: boolean }>;
}

export interface PassportRedeemResult {
    reward: PassportReward;
    transaction: PassportTransaction;
    balance: number;
    fulfillment: { status: "voucher_pending" | "membership_pending"; note: string };
}

export interface ForumPost {
    id: string;
    user_id: string | null;
    title: string;
    content: string;
    city: string | null;
    tags: string[];
    venue_id: string | null;
    is_pinned: boolean;
    is_approved: boolean;
    metrics: { view_count: number; reply_count: number };
    created_at: string;
}

export interface ForumReply {
    id: string;
    post_id: string;
    user_id: string | null;
    parent_id: string | null;
    content: string;
    is_approved: boolean;
    helpful_count: number;
    created_at: string;
}

export interface ForumPostDetail extends ForumPost {
    replies: ForumReply[];
}

export interface RegisterPushTokenResult {
    token_id: string;
    platform: PushPlatform;
    is_active: boolean;
    last_seen_at: string;
}

export interface NotificationPreference {
    user_id: string;
    happy_hour_push_enabled: boolean;
    happy_hour_city: string | null;
    happy_hour_district: string | null;
    created_at: string | null;
    updated_at: string | null;
}

export interface TestPushResult {
    sent: number;
    skipped: boolean;
    success_count: number;
    failure_count: number;
    deactivated_token_count: number;
    reason?: string;
}

export interface FirebaseStatusResult {
    provider: string;
    configured: boolean;
    project_id: string | null;
}

export interface PublicDeal {
    id: string;
    venue_id: string;
    title: string;
    description: string | null;
    discount_type: string | null;
    discount_value: number | null;
    applicable_days: string[];
    start_time: string;
    end_time: string;
    conditions: string | null;
    is_exclusive: boolean;
    is_active: boolean;
    valid_until: string | null;
    created_at: string;
    is_active_today: boolean;
    is_open_now: boolean;
    venue: {
        id: string;
        name: string;
        slug: string;
        city: string;
        district: string | null;
    };
}

export interface BarTourVenueSuggestion {
    id: string;
    slug: string;
    name: string;
    type: string;
    district: string | null;
    city: string;
    price_range: string;
    rating: number | null;
    total_reviews: number;
    total_bookings: number;
    features: string[];
    media: { thumbnail_url: string | null };
    score: number;
    reason: string;
    matched_keywords: string[];
    deals: Array<{
        id: string;
        title: string;
        discount_type: string | null;
        discount_value: number | null;
        start_time: string;
        end_time: string;
        is_exclusive: boolean;
    }>;
    events: Array<{
        id: string;
        slug: string;
        title: string;
        event_date: string;
        start_time: string;
        genre: string[];
    }>;
}

export interface BarTourFoodSuggestion {
    title: string;
    area: string;
    keywords: string[];
    reason: string;
    timing: "before_bar" | "late_night" | "group_dining";
    data_source: "heuristic";
}

export interface BarTourItineraryStep {
    step: string;
    title: string;
    suggestions: Array<BarTourVenueSuggestion | BarTourFoodSuggestion>;
}

export interface BarTourRecommendationResult {
    query: {
        keyword: string | null;
        city: string | null;
        district: string | null;
        price_range: string | null;
        party_size: number | null;
        limit: number;
    };
    itinerary: BarTourItineraryStep[];
    suggestions: {
        bars: BarTourVenueSuggestion[];
        food: BarTourFoodSuggestion[];
    };
    metadata: {
        mode: string;
        data_sources: Record<string, string>;
        note: string;
    };
}

export interface ForumReport {
    id: string;
    post_id: string;
    user_id: string | null;
    reason: string;
    description: string | null;
    status: ForumReportStatus;
    created_at: string;
    post?: { title: string; content: string; is_approved: boolean };
}

export interface ArticleSeo {
    meta_title: string | null;
    meta_description: string | null;
    canonical_url: string | null;
    og_image_url: string | null;
    schema_type: ArticleSchemaType;
}

export interface ArticleListItem {
    id: string;
    author_id: string | null;
    slug: string;
    title: string;
    excerpt: string | null;
    category: ArticleCategory;
    tags: string[];
    city: string | null;
    target_keyword: string | null;
    seo: ArticleSeo;
    status: ArticleStatus;
    is_featured: boolean;
    reading_time_minutes: number;
    view_count: number;
    published_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface ArticleDetail extends ArticleListItem {
    content: string;
    structured_data?: Record<string, unknown>;
}

export interface ArticleImageUploadResult {
    url: string;
    public_id: string;
    width: number;
    height: number;
    format: string;
    bytes: number;
    fingerprint: string;
    alt: string;
    markdown: string;
}
