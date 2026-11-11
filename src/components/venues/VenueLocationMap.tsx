import {
    createGoogleMapsDirectionsUrl,
    createGoogleMapsEmbedUrl,
    createGoogleMapsSearchUrl,
} from "@/lib/google-maps/links";
import { buttonClasses } from "@/components/ui/button-styles";

export function VenueLocationMap({
    name,
    address,
    district,
    lat,
    lng,
}: {
    name: string;
    address: string;
    district: string | null;
    lat: number | null;
    lng: number | null;
}) {
    const place = { lat, lng, address: [address, district].filter(Boolean).join(", ") };
    const embedUrl = createGoogleMapsEmbedUrl(place);
    const searchUrl = createGoogleMapsSearchUrl(place);
    const directionsUrl = createGoogleMapsDirectionsUrl(place);

    if (!embedUrl || !searchUrl || !directionsUrl) {
        return null;
    }

    return (
        <section>
            <p className="mb-3 font-display text-lg font-extrabold">📍 Vị trí</p>
            <div className="overflow-hidden rounded-xl border border-border bg-void-2">
                <iframe
                    src={embedUrl}
                    title={`Bản đồ vị trí ${name}`}
                    className="block h-64 w-full border-0 sm:h-80"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    allowFullScreen
                />
                <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="min-w-0 break-words text-sm text-muted">
                        {address}
                        {district ? ` · ${district}` : ""}
                    </p>
                    <div className="flex shrink-0 gap-2">
                        <a
                            href={searchUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={buttonClasses("secondary", "sm")}
                        >
                            Mở Google Maps
                        </a>
                        <a
                            href={directionsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={buttonClasses("primary", "sm")}
                        >
                            Chỉ đường
                        </a>
                    </div>
                </div>
            </div>
        </section>
    );
}
