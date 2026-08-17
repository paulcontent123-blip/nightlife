import { createSiteUrl } from "@/config/site";
import {
    escapeHtml,
    renderEmailLayout,
    renderInfoRows,
    type EmailTemplate,
} from "./email-template";
import type {
    BookingConfirmationSource,
    BookingNotificationPayload,
    BookingNotificationUser,
    BookingNotificationVenue,
} from "../notification.types";

export function renderUserBookingConfirmedEmail(input: {
    booking: BookingNotificationPayload;
    venue: BookingNotificationVenue;
    user: BookingNotificationUser;
    source: BookingConfirmationSource;
}): EmailTemplate {
    const { booking, venue, user, source } = input;
    const title = `Booking confirmed at ${venue.name}`;
    const bookingUrl = createSiteUrl(`/bookings/${booking.id}`).toString();
    const paymentNote = booking.deposit.paid
        ? "Your deposit has been paid."
        : "Your booking is confirmed. Deposit/payment will be handled at the venue if required.";
    const body = `
        <p style="margin:0 0 16px;">Hi ${escapeHtml(user.display_name)},</p>
        <p style="margin:0 0 20px;">${escapeHtml(paymentNote)}</p>
        ${renderInfoRows([
            ["Booking ID", booking.id],
            ["Venue", venue.name],
            ["Address", venue.address],
            ["Date", booking.booking_date],
            ["Time", booking.booking_time],
            ["Party size", booking.party_size],
            ["Deposit amount", formatMoney(booking.deposit.amount)],
            ["Confirmed by", source],
        ])}
        <p style="margin:22px 0 0;">
            <a href="${bookingUrl}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:11px 16px;border-radius:6px;">View booking</a>
        </p>
    `;

    return {
        subject: title,
        html: renderEmailLayout(title, body),
        text: [
            `Hi ${user.display_name},`,
            paymentNote,
            `Booking ID: ${booking.id}`,
            `Venue: ${venue.name}`,
            `Address: ${venue.address}`,
            `Date: ${booking.booking_date}`,
            `Time: ${booking.booking_time}`,
            `Party size: ${booking.party_size}`,
            `Deposit amount: ${formatMoney(booking.deposit.amount)}`,
            `View booking: ${bookingUrl}`,
        ].join("\n"),
    };
}

export function renderAdminBookingConfirmedEmail(input: {
    booking: BookingNotificationPayload;
    venue: BookingNotificationVenue;
    user: BookingNotificationUser;
    source: BookingConfirmationSource;
}): EmailTemplate {
    const { booking, venue, user, source } = input;
    const title = `Prepare booking for ${venue.name}`;
    const adminUrl = createSiteUrl(`/admin/bookings/${booking.id}`).toString();
    const body = `
        <p style="margin:0 0 20px;">A booking has been confirmed and needs venue preparation.</p>
        ${renderInfoRows([
            ["Booking ID", booking.id],
            ["Venue", venue.name],
            ["Customer", `${user.display_name} (${user.email})`],
            ["Date", booking.booking_date],
            ["Time", booking.booking_time],
            ["Party size", booking.party_size],
            ["Deposit paid", booking.deposit.paid ? "yes" : "no"],
            ["Deposit amount", formatMoney(booking.deposit.amount)],
            ["Confirmed by", source],
            ["Requests", booking.special_requests],
        ])}
        <p style="margin:22px 0 0;">
            <a href="${adminUrl}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:11px 16px;border-radius:6px;">Open admin booking</a>
        </p>
    `;

    return {
        subject: title,
        html: renderEmailLayout(title, body),
        text: [
            "A booking has been confirmed and needs venue preparation.",
            `Booking ID: ${booking.id}`,
            `Venue: ${venue.name}`,
            `Customer: ${user.display_name} (${user.email})`,
            `Date: ${booking.booking_date}`,
            `Time: ${booking.booking_time}`,
            `Party size: ${booking.party_size}`,
            `Deposit paid: ${booking.deposit.paid ? "yes" : "no"}`,
            `Deposit amount: ${formatMoney(booking.deposit.amount)}`,
            `Confirmed by: ${source}`,
            `Requests: ${booking.special_requests ?? "-"}`,
            `Admin URL: ${adminUrl}`,
        ].join("\n"),
    };
}

function formatMoney(amount: number) {
    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0,
    }).format(amount);
}
