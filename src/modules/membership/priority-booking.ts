import { AuthException } from "@/modules/auth/auth.errors";

const FREE_ADVANCE_BOOKING_DAYS = readPositiveInteger(
    process.env.MEMBERSHIP_FREE_BOOKING_WINDOW_DAYS,
    30
);
const HOURS_PER_DAY = 24;
const VIETNAM_TIMEZONE_OFFSET = "+07:00";

export function assertWithinPriorityBookingWindow(date: string, priorityBookingHours: number) {
    const window = createPriorityBookingWindow(priorityBookingHours);

    if (isDateWithinWindow(date, window.max_booking_date)) {
        return window;
    }

    throw new AuthException(
        403,
        "PRIORITY_BOOKING_REQUIRED",
        `Free users can book up to ${FREE_ADVANCE_BOOKING_DAYS} days ahead. VIP members can access availability ${priorityBookingHours} hours earlier.`
    );
}

export function createPriorityBookingWindow(priorityBookingHours: number) {
    const safePriorityHours = Math.max(0, priorityBookingHours);
    const maxAdvanceHours = FREE_ADVANCE_BOOKING_DAYS * HOURS_PER_DAY + safePriorityHours;
    const maxDate = new Date(Date.now() + maxAdvanceHours * 60 * 60 * 1000);

    return {
        free_advance_days: FREE_ADVANCE_BOOKING_DAYS,
        priority_booking_hours: safePriorityHours,
        max_advance_hours: maxAdvanceHours,
        max_booking_date: formatVietnamDate(maxDate),
    };
}

function isDateWithinWindow(date: string, maxDate: string) {
    return Date.parse(`${date}T00:00:00${VIETNAM_TIMEZONE_OFFSET}`)
        <= Date.parse(`${maxDate}T23:59:59${VIETNAM_TIMEZONE_OFFSET}`);
}

function formatVietnamDate(date: Date) {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Ho_Chi_Minh",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(date);
}

function readPositiveInteger(value: string | undefined, fallback: number) {
    const parsedValue = Number(value);

    return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
}
