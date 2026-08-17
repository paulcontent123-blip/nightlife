export const AuthError = {

    EMAIL_EXISTS: "Email already exists",

    INVALID_PASSWORD: "Invalid password",

    EMAIL_NOT_CONFIRMED: "Email is not confirmed",

    LOGIN_FAILED: "Login failed",

    USER_NOT_FOUND: "User not found",

    UNAUTHORIZED: "Unauthorized",

    FORBIDDEN: "Forbidden",

    INVALID_REFRESH_TOKEN: "Invalid refresh token",

    INVALID_AVATAR: "Avatar must be an image file",

    OAUTH_FAILED: "Google OAuth failed",

    PROFILE_SYNC_FAILED: "Could not sync user profile",

    INVALID_JSON: "Invalid JSON payload",

    DATABASE_ERROR: "Database error",

    VENUE_NOT_FOUND: "Venue not found",

    SLUG_EXISTS: "Slug already exists",

    VENUE_TABLE_NOT_FOUND: "Venue table not found",

    DEAL_NOT_FOUND: "Deal not found",

    EVENT_NOT_FOUND: "Event not found",

    TICKET_TIER_NOT_FOUND: "Ticket tier not found",

    TICKET_TIER_HAS_SALES: "Ticket tier with sold tickets cannot be deleted",

    TICKET_ORDER_NOT_FOUND: "Ticket order not found",

    TICKET_INVALID_QUANTITY: "Ticket quantity must be between 1 and 10",

    TICKET_SALE_NOT_OPEN: "Ticket sale has not started yet",

    TICKET_SALE_CLOSED: "Ticket sale has ended",

    TICKET_INSUFFICIENT_INVENTORY: "Not enough tickets available",

    TICKET_ORDER_LOCK_EXPIRED: "Ticket order lock has expired",

    TICKET_ORDER_CANNOT_BE_CONFIRMED: "Ticket order cannot be confirmed in its current status",

    TICKET_NOT_FOUND: "Ticket not found",

    TICKET_ALREADY_USED: "Ticket has already been used",

    BOOKING_NOT_VERIFIED: "A verified booking is required to review this venue",

    REVIEW_EXISTS: "This booking has already been reviewed",

    BOOKING_NOT_FOUND: "Booking not found",

    VENUE_TABLE_UNAVAILABLE: "Venue table is unavailable for this booking",

    BOOKING_CONFLICT: "This table is already booked for the selected time",

    BOOKING_CANCEL_WINDOW_EXPIRED: "Booking can only be cancelled more than 2 hours before the booking time",

    BOOKING_CANNOT_BE_CANCELLED: "Booking cannot be cancelled in its current status",

    BOOKING_CANNOT_BE_CONFIRMED: "Booking can only be confirmed while it is pending",

    BOOKING_CANNOT_BE_CHECKED_IN: "Booking cannot be checked in in its current status",

    BOOKING_CANNOT_BE_COMPLETED: "Booking can only be completed after check-in",

    SQUAD_NOT_FOUND: "Squad not found",

    SQUAD_FULL: "Squad is already full",

    SQUAD_ALREADY_JOINED: "User already joined this squad",

    SQUAD_NOT_JOINED: "User has not joined this squad",

    SQUAD_HOST_REQUIRED: "Only the squad host can perform this action",

    SQUAD_CANNOT_BE_CONFIRMED: "Squad cannot be confirmed in its current status",

    SQUAD_BILL_NOT_SPLIT: "Squad bill has not been split yet",

    PAYMENT_NOT_REQUIRED: "This booking does not require payment",

    PAYMENT_ALREADY_PAID: "This booking has already been paid",

    PAYMENT_INVALID_STATUS: "Payment cannot be created for this booking status",

    PAYMENT_NOT_FOUND: "Payment reference was not found",

    PAYMENT_AMOUNT_MISMATCH: "Payment amount does not match booking deposit",

    PAYMENT_IPN_FAILED: "Payment IPN could not be processed",

    INVALID_VENUE_IMAGE: "Venue photos must be image files",

    CLOUDINARY_UPLOAD_FAILED: "Could not upload venue photos",

    INVALID_EVENT_IMAGE: "Event photos must be image files",

    CLOUDINARY_EVENT_UPLOAD_FAILED: "Could not upload event photos",

    INVALID_REVIEW_IMAGE: "Review images must be image files",

    REVIEW_IMAGE_UPLOAD_FAILED: "Could not upload review images",

    FORUM_POST_NOT_FOUND: "Forum post not found",

    FORUM_REPLY_NOT_FOUND: "Forum reply not found",

    FORUM_PARENT_REPLY_INVALID: "Parent reply does not belong to this forum post",

    FORUM_REPORT_NOT_FOUND: "Forum report not found",

    MEMBERSHIP_TIER_NOT_FOUND: "Membership tier not found",

    MEMBERSHIP_ALREADY_ACTIVE: "Membership tier is already active",

    MEMBERSHIP_SUBSCRIPTION_NOT_FOUND: "Membership subscription not found",

    MEMBERSHIP_PAYMENT_PENDING: "Membership payment is already pending confirmation",

    MEMBERSHIP_PAYMENT_AMOUNT_MISMATCH: "Membership payment amount does not match subscription amount",

    MEMBERSHIP_PAYMENT_INVALID_STATUS: "Membership payment cannot be processed in its current status",

    MEMBERSHIP_CANNOT_BE_CONFIRMED: "Membership subscription cannot be confirmed in its current status",

    MEMBERSHIP_CANNOT_BE_CANCELLED: "Membership subscription cannot be cancelled in its current status"
    ,

    PRIORITY_BOOKING_REQUIRED: "This booking date is only available for VIP members during the priority booking window",

    PASSPORT_REWARD_NOT_FOUND: "Passport reward not found",

    PASSPORT_INSUFFICIENT_POINTS: "Not enough passport points to redeem this reward",

    CRON_NOT_CONFIGURED: "Cron secret is not configured",

    INVALID_CRON_SECRET: "Invalid cron authorization",

    ARTICLE_NOT_FOUND: "Article not found",

    INVALID_ARTICLE_IMAGE: "Article image must be an image file",

    ARTICLE_IMAGE_UPLOAD_FAILED: "Could not upload article image"

};

export class AuthException extends Error {
    constructor(
        public status: number,
        public code: keyof typeof AuthError,
        message = AuthError[code]
    ) {
        super(message);
        this.name = "AuthException";
    }
}
