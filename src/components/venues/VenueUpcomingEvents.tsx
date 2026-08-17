import { serverFetch } from "@/lib/api/server";
import { ApiError } from "@/lib/api/envelope";
import type { Event, Paginated } from "@/lib/api/types";
import { EventCard } from "@/components/events/EventCard";

export async function VenueUpcomingEvents({ slug }: { slug: string }) {
    let events: Event[] = [];

    try {
        const result = await serverFetch<Paginated<Event>>(
            `/api/v1/venues/${slug}/events?is_active=true&limit=4`
        );

        events = result.items;
    } catch (error) {
        if (!(error instanceof ApiError)) {
            throw error;
        }
    }

    if (events.length === 0) {
        return null;
    }

    return (
        <section>
            <p className="mb-3 font-display text-lg font-extrabold">🎫 Sự kiện sắp tới</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {events.map((event) => (
                    <EventCard key={event.id} event={event} />
                ))}
            </div>
        </section>
    );
}
