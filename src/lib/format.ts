export function formatVnd(amount: number) {
    return `${new Intl.NumberFormat("vi-VN").format(amount)}đ`;
}

export function formatDate(value: string) {
    return new Date(`${value}T00:00:00+07:00`).toLocaleDateString("vi-VN", {
        weekday: "short",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
}

export const VENUE_TYPE_LABEL: Record<string, string> = {
    rooftop_bar: "Rooftop Bar",
    club: "Club",
    wine_bar: "Wine Bar",
    live_music: "Live Music",
    terrace: "Terrace",
    lounge: "Lounge",
};

export const VENUE_TYPE_EMOJI: Record<string, string> = {
    rooftop_bar: "🌆",
    club: "🎵",
    wine_bar: "🍷",
    live_music: "🎸",
    terrace: "🌿",
    lounge: "🎭",
};

export const CITY_LABEL: Record<string, string> = {
    hcm: "TP.HCM",
    hanoi: "Hà Nội",
    danang: "Đà Nẵng",
};

export function formatTime(value: string) {
    return value.slice(0, 5);
}

export function formatDayMonth(value: string) {
    const date = new Date(`${value}T00:00:00+07:00`);

    return {
        day: date.toLocaleDateString("vi-VN", { day: "2-digit" }),
        month: `T${date.getMonth() + 1}`,
    };
}

export const TICKET_ORDER_STATUS_LABEL: Record<string, string> = {
    pending: "Chờ xác nhận",
    paid: "Đã phát hành vé",
    refunded: "Đã hoàn tiền",
};

export const TICKET_STATUS_LABEL: Record<string, string> = {
    valid: "Còn hiệu lực",
    used: "Đã sử dụng",
    refunded: "Đã hoàn tiền",
};

export const BOOKING_STATUS_LABEL: Record<string, string> = {
    pending: "Chờ xác nhận",
    confirmed: "Đã xác nhận",
    seated: "Đã nhận bàn",
    completed: "Hoàn tất",
    cancelled: "Đã huỷ",
    no_show: "Không đến",
};

export const MEMBERSHIP_TIER_LABEL: Record<string, string> = {
    free: "Free",
    night_pass: "Night Pass",
    black_card: "Black Card",
};

export const MEMBERSHIP_STATUS_LABEL: Record<string, string> = {
    free: "Chưa nâng cấp",
    active: "Đang hoạt động",
    expired: "Đã hết hạn",
};

export const MEMBERSHIP_SUB_STATUS_LABEL: Record<string, string> = {
    pending_payment: "Chờ thanh toán",
    payment_received: "Chờ admin xác nhận",
    active: "Đang hoạt động",
    cancelled: "Đã huỷ",
    expired: "Đã hết hạn",
    rejected: "Đã từ chối",
};

export const PASSPORT_SOURCE_LABEL: Record<string, string> = {
    venue_checkin: "Check-in venue",
    venue_review: "Đánh giá venue",
    ticket_order: "Mua vé sự kiện",
    reward_redeem: "Đổi thưởng",
};

export const FORUM_REPORT_STATUS_LABEL: Record<string, string> = {
    open: "Chưa xử lý",
    reviewed: "Đã xem xét",
    dismissed: "Đã bỏ qua",
};

export function shortUserId(userId: string | null) {
    return userId ? `Ẩn danh #${userId.slice(0, 6)}` : "Ẩn danh";
}

export function dealDiscountLabel(deal: { discount_type: string | null; discount_value: number | null }) {
    if (deal.discount_type === "percent" && deal.discount_value) {
        return `-${deal.discount_value}%`;
    }

    if (deal.discount_type === "fixed" && deal.discount_value) {
        return formatVnd(deal.discount_value);
    }

    if (deal.discount_type === "b1g1") {
        return "1 tặng 1";
    }

    if (deal.discount_type === "free_entry") {
        return "Miễn phí";
    }

    return deal.discount_value ? String(deal.discount_value) : "Ưu đãi";
}

export const ARTICLE_CATEGORY_LABEL: Record<string, string> = {
    guide: "Guide",
    listicle: "Top list",
    news: "News",
    review: "Review",
    local_seo: "Local SEO",
    event_guide: "Event guide",
    deal_guide: "Deal guide",
};

export const ARTICLE_STATUS_LABEL: Record<string, string> = {
    draft: "Bản nháp",
    published: "Đã đăng",
    archived: "Đã lưu trữ",
};
