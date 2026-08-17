import { Badge } from "@/components/ui/Badge";
import { BOOKING_STATUS_LABEL } from "@/lib/format";
import type { BookingStatus } from "@/lib/api/types";

const STATUS_TONE: Record<BookingStatus, "amber" | "cyan" | "green" | "gray" | "red"> = {
    pending: "amber",
    confirmed: "cyan",
    seated: "cyan",
    completed: "green",
    cancelled: "gray",
    no_show: "red",
};

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
    return <Badge tone={STATUS_TONE[status] ?? "gray"}>{BOOKING_STATUS_LABEL[status] ?? status}</Badge>;
}
