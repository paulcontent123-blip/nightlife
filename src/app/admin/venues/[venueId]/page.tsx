import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { serverFetch } from "@/lib/api/server";
import { ApiError } from "@/lib/api/envelope";
import type { Event, Paginated, Venue, VenueTable } from "@/lib/api/types";
import { VenueForm } from "@/components/admin/VenueForm";
import { VenuePhotoManager } from "@/components/admin/VenuePhotoManager";
import { VenueTableManager } from "@/components/admin/VenueTableManager";
import { VenueEventManager } from "@/components/admin/VenueEventManager";
import { Card } from "@/components/ui/Card";

export const metadata: Metadata = { title: "Sửa venue · Admin Nightlife.vn" };

interface PageProps {
    params: Promise<{ venueId: string }>;
}

export default async function EditVenuePage({ params }: PageProps) {
    const { venueId } = await params;
    let venue: Venue;
    let tables: VenueTable[] = [];
    let events: Event[] = [];

    try {
        venue = await serverFetch<Venue>(`/api/v1/admin/venues/${venueId}`);
        const [tablesResult, eventsResult] = await Promise.all([
            serverFetch<Paginated<VenueTable>>(`/api/v1/admin/venues/${venueId}/tables?limit=100`),
            serverFetch<Paginated<Event>>(`/api/v1/admin/venues/${venueId}/events?limit=100`),
        ]);
        tables = tablesResult.items;
        events = eventsResult.items;
    } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
            notFound();
        }

        throw error;
    }

    return (
        <div className="flex max-w-3xl flex-col gap-8">
            <div>
                <Link href="/admin/venues" className="mb-3 inline-block text-sm text-muted hover:text-white">
                    ← Venues
                </Link>
                <h1 className="font-display text-2xl font-extrabold">{venue.name}</h1>
                <p className="text-sm text-muted">/venues/{venue.slug}</p>
            </div>

            <Card className="p-5">
                <p className="mb-4 font-display text-sm font-bold uppercase tracking-wide text-muted">Ảnh venue</p>
                <VenuePhotoManager venueId={venue.id} initialMedia={venue.media} />
            </Card>

            <Card className="p-5">
                <p className="mb-4 font-display text-sm font-bold uppercase tracking-wide text-muted">Bàn / khu vực</p>
                <VenueTableManager venueId={venue.id} initialTables={tables} />
            </Card>

            <Card className="p-5">
                <p className="mb-4 font-display text-sm font-bold uppercase tracking-wide text-muted">Sự kiện</p>
                <VenueEventManager venueId={venue.id} initialEvents={events} />
            </Card>

            <Card className="p-5">
                <VenueForm mode="edit" venueId={venue.id} initialVenue={venue} />
            </Card>
        </div>
    );
}
