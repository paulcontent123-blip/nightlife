import Link from "next/link";
import type { Event } from "@/lib/api/types";
import { formatDayMonth, formatTime } from "@/lib/format";

export function EventCard({ event }: { event: Event }) {
    const { day, month } = formatDayMonth(event.event_date);

    return (
        <Link
            href={`/events/${event.slug}`}
            prefetch={false}
            className="flex overflow-hidden rounded-xl border border-border bg-void-3 shadow-[0_4px_28px_rgba(0,0,0,.5)] transition-all hover:-translate-y-1 hover:border-amber-border hover:bg-void-4"
        >
            <div className="flex w-[70px] shrink-0 flex-col items-center justify-center border-r border-border py-3.5">
                <span className="font-display text-2xl font-extrabold leading-none text-amber">{day}</span>
                <span className="mt-1 text-[11px] font-semibold text-muted">{month}</span>
            </div>
            <div className="flex-1 p-4">
                <p className="mb-1 font-display text-[15px] font-bold leading-snug text-white">{event.title}</p>
                <p className="mb-2 text-xs text-muted">
                    {formatTime(event.start_time)}
                    {event.end_time ? `–${formatTime(event.end_time)}` : ""}
                    {event.genre.length > 0 ? ` · ${event.genre.join(", ")}` : ""}
                </p>
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted">{event.age_restriction}+</span>
                    <span className="font-display text-[11.5px] font-bold text-amber">
                        {event.is_free ? "Miễn phí" : "Xem vé →"}
                    </span>
                </div>
            </div>
        </Link>
    );
}
