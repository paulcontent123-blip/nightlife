import { Badge } from "@/components/ui/Badge";
import { TICKET_STATUS_LABEL } from "@/lib/format";
import type { TicketStatus } from "@/lib/api/types";

const STATUS_TONE: Record<TicketStatus, "amber" | "cyan" | "green" | "gray" | "red"> = {
    valid: "green",
    used: "gray",
    refunded: "red",
};

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
    return <Badge tone={STATUS_TONE[status] ?? "gray"}>{TICKET_STATUS_LABEL[status] ?? status}</Badge>;
}
