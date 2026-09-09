import Link from "next/link";
import type { Ticket } from "@/lib/api/types";
import { TicketStatusBadge } from "./TicketStatusBadge";
import { formatDate, formatTime } from "@/lib/format";

export function TicketCard({ ticket }: { ticket: Ticket }) {
    return (
        <div className="rounded-xl border border-border bg-void-2 p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
                <TicketStatusBadge status={ticket.status} />
                <span className="font-mono text-[11px] text-muted">#{ticket.id.slice(0, 8)}</span>
            </div>
            {ticket.event ? (
                <>
                    <Link href={`/events/${ticket.event.slug}`} prefetch={false} className="font-display text-[15px] font-bold text-white hover:text-amber">
                        {ticket.event.title}
                    </Link>
                    <p className="mt-0.5 text-xs text-muted">
                        {formatDate(ticket.event.event_date)} · {formatTime(ticket.event.start_time)}
                    </p>
                </>
            ) : (
                <p className="text-sm text-muted">Sự kiện #{ticket.event_id.slice(0, 8)}</p>
            )}
            <div className="mt-3 rounded-lg border border-border-strong bg-void-3 px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Mã vé</p>
                <p className="font-mono text-sm text-amber">{ticket.ticket_code}</p>
            </div>
        </div>
    );
}
