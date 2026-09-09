import { AuthException } from "@/modules/auth/auth.errors";
import { EventListService } from "@/modules/events/event-list.service";
import type { Event } from "@/lib/api/types";
import { EventCard } from "@/components/events/EventCard";

const eventListService = new EventListService();

export async function VenueUpcomingEvents({ venueId }: { venueId: string }) {
    let events: Event[] = [];

    try {
        const result = await eventListService.listPublicVenueEventsById(
            venueId,
            new URLSearchParams({ is_active: "true", limit: "4" })
        );

        events = result.items;
    } catch (error) {
        if (!(error instanceof AuthException)) {
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
