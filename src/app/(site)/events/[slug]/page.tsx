import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { serverFetch } from "@/lib/api/server";
import { ApiError } from "@/lib/api/envelope";
import type { Event } from "@/lib/api/types";
import { Badge } from "@/components/ui/Badge";
import { TicketPurchaseWidget } from "@/components/events/TicketPurchaseWidget";
import { formatDate, formatTime } from "@/lib/format";

interface EventPageProps {
    params: Promise<{ slug: string }>;
}

async function getEvent(slug: string): Promise<Event | null> {
    try {
        return await serverFetch<Event>(`/api/v1/events/${slug}`);
    } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
            return null;
        }

        throw error;
    }
}

export async function generateMetadata({ params }: EventPageProps): Promise<Metadata> {
    const { slug } = await params;
    const event = await getEvent(slug);

    return { title: event ? `${event.title} · Nightlife.vn` : "Sự kiện không tồn tại · Nightlife.vn" };
}

export default async function EventDetailPage({ params }: EventPageProps) {
    const { slug } = await params;
    const event = await getEvent(slug);

    if (!event) {
        notFound();
    }

    return (
        <div>
            <div className="relative flex h-56 items-center justify-center overflow-hidden border-b border-border bg-gradient-to-br from-void-3 to-void-4 text-6xl sm:h-72">
                {event.media.thumbnail_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={event.media.thumbnail_url} alt={event.title} className="h-full w-full object-cover" />
                ) : (
                    <span>🎫</span>
                )}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-void via-void/50 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-6xl px-5 pb-6 sm:px-10">
                    <div className="mb-2 flex flex-wrap gap-2">
                        {event.genre.map((genre) => (
                            <Badge key={genre} tone="amber">
                                {genre}
                            </Badge>
                        ))}
                        {event.is_free && <Badge tone="green">Miễn phí</Badge>}
                    </div>
                    <h1 className="font-display text-3xl font-extrabold sm:text-4xl">{event.title}</h1>
                    <p className="mt-1 text-sm text-muted">
                        {formatDate(event.event_date)} · {formatTime(event.start_time)}
                        {event.end_time ? `–${formatTime(event.end_time)}` : ""}
                    </p>
                </div>
            </div>

            <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-5 py-10 sm:px-10 lg:grid-cols-[1fr_360px]">
                <div className="flex flex-col gap-8">
                    {event.description && (
                        <section>
                            <p className="mb-2 font-display text-lg font-extrabold">Giới thiệu</p>
                            <p className="whitespace-pre-line text-sm leading-relaxed text-muted">{event.description}</p>
                        </section>
                    )}

                    {event.lineup.length > 0 && (
                        <section>
                            <p className="mb-2 font-display text-lg font-extrabold">🎤 Line-up</p>
                            <div className="flex flex-wrap gap-1.5">
                                {event.lineup.map((artist) => (
                                    <span key={artist} className="rounded-md bg-white/5 px-2.5 py-1 text-xs font-semibold text-white">
                                        {artist}
                                    </span>
                                ))}
                            </div>
                        </section>
                    )}

                    <div className="flex flex-wrap gap-5 rounded-xl border border-border bg-void-2 p-4 text-sm">
                        <span className="text-muted">Độ tuổi: <span className="text-white">{event.age_restriction}+</span></span>
                        {event.total_capacity && (
                            <span className="text-muted">Sức chứa: <span className="text-white">{event.total_capacity}</span></span>
                        )}
                    </div>
                </div>

                <div>
                    <TicketPurchaseWidget slug={event.slug} />
                </div>
            </div>
        </div>
    );
}
