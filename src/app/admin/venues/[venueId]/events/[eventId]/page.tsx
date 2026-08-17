import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { serverFetch } from "@/lib/api/server";
import { ApiError } from "@/lib/api/envelope";
import type { Event, TicketTier } from "@/lib/api/types";
import { EventForm } from "@/components/admin/EventForm";
import { TicketTierManager } from "@/components/admin/TicketTierManager";
import { Card } from "@/components/ui/Card";

export const metadata: Metadata = { title: "Sửa sự kiện · Admin Nightlife.vn" };

interface PageProps {
    params: Promise<{ venueId: string; eventId: string }>;
}

export default async function EditEventPage({ params }: PageProps) {
    const { venueId, eventId } = await params;
    let event: Event;
    let tiers: TicketTier[] = [];

    try {
        event = await serverFetch<Event>(`/api/v1/admin/venues/${venueId}/events/${eventId}`);
        const tiersResult = await serverFetch<{ items: TicketTier[] }>(`/api/v1/admin/events/${eventId}/ticket-tiers`);
        tiers = tiersResult.items;
    } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
            notFound();
        }

        throw error;
    }

    return (
        <div className="flex max-w-3xl flex-col gap-8">
            <div>
                <Link href={`/admin/venues/${venueId}`} className="mb-3 inline-block text-sm text-muted hover:text-white">
                    ← Venue
                </Link>
                <h1 className="font-display text-2xl font-extrabold">{event.title}</h1>
                <p className="text-sm text-muted">/events/{event.slug}</p>
            </div>

            <Card className="p-5">
                <p className="mb-4 font-display text-sm font-bold uppercase tracking-wide text-muted">Loại vé</p>
                <TicketTierManager eventId={event.id} initialTiers={tiers} />
            </Card>

            <Card className="p-5">
                <EventForm venueId={venueId} event={event} />
            </Card>
        </div>
    );
}
