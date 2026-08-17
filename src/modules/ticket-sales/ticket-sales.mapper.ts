import { createSiteUrl } from "@/config/site";
import type { TicketOrderRow, TicketRow } from "./ticket-sales.types";

interface JoinedEvent {
    slug: string;
    title: string;
    event_date: string;
    start_time: string;
    thumbnail_url: string | null;
}

export function mapTicketOrder(row: TicketOrderRow) {
    return {
        id: row.id,
        user_id: row.user_id,
        event_id: row.event_id,
        total_amount: row.total_amount,
        platform_fee: row.platform_fee,
        status: row.status,
        payment_method: row.payment_method,
        payment_ref: row.payment_ref,
        created_at: row.created_at,
    };
}

export function mapTicket(row: TicketRow & { events?: JoinedEvent | null }) {
    const scanUrl = createSiteUrl(`/api/v1/tickets/${row.ticket_code}`).toString();

    return {
        id: row.id,
        tier_id: row.tier_id,
        event_id: row.event_id,
        user_id: row.user_id,
        order_id: row.order_id,
        ticket_code: row.ticket_code,
        qr_code: row.ticket_code,
        qr_url: scanUrl,
        status: row.status,
        checked_in_at: row.checked_in_at,
        created_at: row.created_at,
        event: row.events
            ? {
                slug: row.events.slug,
                title: row.events.title,
                event_date: row.events.event_date,
                start_time: row.events.start_time,
                thumbnail_url: row.events.thumbnail_url,
            }
            : undefined,
    };
}
