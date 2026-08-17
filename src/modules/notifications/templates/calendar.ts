import { createSiteUrl } from "@/config/site";
import type {
    BookingNotificationPayload,
    BookingNotificationVenue,
} from "../notification.types";

const DEFAULT_BOOKING_DURATION_HOURS = 2;

export function createBookingCalendarAttachment(
    booking: BookingNotificationPayload,
    venue: BookingNotificationVenue
) {
    const start = createBookingDate(booking.booking_date, booking.booking_time);
    const end = new Date(start.getTime() + DEFAULT_BOOKING_DURATION_HOURS * 60 * 60 * 1000);
    const bookingUrl = createSiteUrl(`/bookings/${booking.id}`).toString();
    const ics = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Nightlife//Booking//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "BEGIN:VEVENT",
        `UID:booking-${booking.id}@nightlife`,
        `DTSTAMP:${formatIcsDate(new Date())}`,
        `DTSTART:${formatIcsDate(start)}`,
        `DTEND:${formatIcsDate(end)}`,
        `SUMMARY:${escapeIcsText(`Nightlife booking at ${venue.name}`)}`,
        `LOCATION:${escapeIcsText(venue.address)}`,
        `DESCRIPTION:${escapeIcsText(`Booking ${booking.id}. View details: ${bookingUrl}`)}`,
        `URL:${bookingUrl}`,
        "END:VEVENT",
        "END:VCALENDAR",
    ].join("\r\n");

    return {
        filename: `booking-${booking.id}.ics`,
        content: ics,
        contentType: "text/calendar; charset=utf-8; method=PUBLISH",
    };
}

function createBookingDate(date: string, time: string) {
    return new Date(`${date}T${time}:00+07:00`);
}

function formatIcsDate(date: Date) {
    return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function escapeIcsText(value: string) {
    return value
        .replace(/\\/g, "\\\\")
        .replace(/\n/g, "\\n")
        .replace(/,/g, "\\,")
        .replace(/;/g, "\\;");
}
