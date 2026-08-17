import { createSiteUrl } from "@/config/site";
import {
    escapeHtml,
    renderEmailLayout,
    renderInfoRows,
    type EmailTemplate,
} from "./email-template";

interface TicketEmailEvent {
    id: string;
    title: string;
    event_date: string;
    start_time: string;
}

interface TicketEmailTier {
    id: string;
    name: string;
    price: number;
}

interface TicketEmailUser {
    display_name: string;
}

interface TicketEmailOrder {
    id: string;
    quantity: number;
    total_amount: number;
    payment_method: string | null;
}

interface TicketEmailTicket {
    ticket_code: string;
    qr_url: string;
}

export function renderTicketsIssuedEmail(input: {
    user: TicketEmailUser;
    event: TicketEmailEvent;
    tier: TicketEmailTier;
    order: TicketEmailOrder;
    tickets: TicketEmailTicket[];
}): EmailTemplate {
    const { user, event, tier, order, tickets } = input;
    const title = `Tickets issued for ${event.title}`;
    const orderUrl = createSiteUrl(`/tickets`).toString();
    const ticketRows = tickets.map((ticket, index) => `
        <tr>
            <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;">${index + 1}</td>
            <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-family:monospace;">${escapeHtml(ticket.ticket_code)}</td>
            <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;">
                <a href="${escapeHtml(ticket.qr_url)}">${escapeHtml(ticket.qr_url)}</a>
            </td>
        </tr>
    `).join("");
    const body = `
        <p style="margin:0 0 16px;">Hi ${escapeHtml(user.display_name)},</p>
        <p style="margin:0 0 20px;">Your payment has been confirmed and your tickets are ready.</p>
        ${renderInfoRows([
            ["Order ID", order.id],
            ["Event", event.title],
            ["Date", event.event_date],
            ["Time", event.start_time],
            ["Tier", tier.name],
            ["Quantity", order.quantity],
            ["Total", formatMoney(order.total_amount)],
            ["Payment method", order.payment_method],
        ])}
        <h2 style="font-size:16px;margin:24px 0 8px;">Ticket QR Codes</h2>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
            <tr>
                <th align="left" style="padding:8px 0;color:#6b7280;">#</th>
                <th align="left" style="padding:8px 0;color:#6b7280;">Code</th>
                <th align="left" style="padding:8px 0;color:#6b7280;">QR URL</th>
            </tr>
            ${ticketRows}
        </table>
        <p style="margin:22px 0 0;">
            <a href="${orderUrl}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:11px 16px;border-radius:6px;">View my tickets</a>
        </p>
    `;

    return {
        subject: title,
        html: renderEmailLayout(title, body),
        text: [
            `Hi ${user.display_name},`,
            "Your payment has been confirmed and your tickets are ready.",
            `Order ID: ${order.id}`,
            `Event: ${event.title}`,
            `Date: ${event.event_date}`,
            `Time: ${event.start_time}`,
            `Tier: ${tier.name}`,
            `Quantity: ${order.quantity}`,
            `Total: ${formatMoney(order.total_amount)}`,
            ...tickets.map((ticket, index) => `Ticket ${index + 1}: ${ticket.ticket_code} - ${ticket.qr_url}`),
        ].join("\n"),
    };
}

export function createTicketsPdfAttachment(input: {
    event: TicketEmailEvent;
    tier: TicketEmailTier;
    order: TicketEmailOrder;
    tickets: TicketEmailTicket[];
}) {
    const lines = [
        "Nightlife Tickets",
        `Event: ${input.event.title}`,
        `Date: ${input.event.event_date} ${input.event.start_time}`,
        `Order: ${input.order.id}`,
        `Tier: ${input.tier.name}`,
        `Quantity: ${input.order.quantity}`,
        `Total: ${formatMoney(input.order.total_amount)}`,
        "",
        ...input.tickets.flatMap((ticket, index) => [
            `Ticket ${index + 1}`,
            `Code: ${ticket.ticket_code}`,
            `QR URL: ${ticket.qr_url}`,
            "",
        ]),
    ];

    return {
        filename: `tickets-${input.order.id}.pdf`,
        content: createSimplePdf(lines),
        contentType: "application/pdf",
    };
}

function createSimplePdf(lines: string[]) {
    const contentLines = [
        "BT",
        "/F1 12 Tf",
        "50 790 Td",
        "16 TL",
        ...lines.map((line) => `(${escapePdfText(line)}) Tj T*`),
        "ET",
    ];
    const content = contentLines.join("\n");
    const objects = [
        "<< /Type /Catalog /Pages 2 0 R >>",
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        `<< /Length ${Buffer.byteLength(content, "utf8")} >>\nstream\n${content}\nendstream`,
    ];
    const chunks = ["%PDF-1.4\n"];
    const offsets: number[] = [];

    for (const [index, object] of objects.entries()) {
        offsets.push(Buffer.byteLength(chunks.join(""), "utf8"));
        chunks.push(`${index + 1} 0 obj\n${object}\nendobj\n`);
    }

    const xrefOffset = Buffer.byteLength(chunks.join(""), "utf8");

    chunks.push(`xref\n0 ${objects.length + 1}\n`);
    chunks.push("0000000000 65535 f \n");
    offsets.forEach((offset) => {
        chunks.push(`${offset.toString().padStart(10, "0")} 00000 n \n`);
    });
    chunks.push(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`);
    chunks.push(`startxref\n${xrefOffset}\n%%EOF`);

    return Buffer.from(chunks.join(""), "utf8");
}

function escapePdfText(value: string) {
    return value
        .replace(/\\/g, "\\\\")
        .replace(/\(/g, "\\(")
        .replace(/\)/g, "\\)");
}

function formatMoney(amount: number) {
    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0,
    }).format(amount);
}
