// Public Google Maps links. None of these need an API key or are billed, so
// they are safe to build anywhere (server or client).
// https://developers.google.com/maps/documentation/urls/get-started

export interface MapPlace {
    // Postgres DECIMAL columns may arrive as strings.
    lat: number | string | null;
    lng: number | string | null;
    address?: string | null;
}

// Coordinates pin the exact spot the admin saved; the address is a fallback
// for venues without coordinates.
export function toMapQuery(place: MapPlace) {
    const lat = toCoordinate(place.lat);
    const lng = toCoordinate(place.lng);

    if (lat !== null && lng !== null) {
        return `${lat},${lng}`;
    }

    return place.address?.trim() || null;
}

// Opens the place in the Google Maps app (mobile) or website.
export function createGoogleMapsSearchUrl(place: MapPlace) {
    const query = toMapQuery(place);

    return query
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
        : null;
}

// Opens turn-by-turn directions from the user's current location.
export function createGoogleMapsDirectionsUrl(place: MapPlace) {
    const query = toMapQuery(place);

    return query
        ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`
        : null;
}

// Keyless embeddable map with a pin on the place.
export function createGoogleMapsEmbedUrl(place: MapPlace, zoom = 16) {
    const query = toMapQuery(place);

    return query
        ? `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=${zoom}&hl=vi&output=embed`
        : null;
}

function toCoordinate(value: number | string | null) {
    if (value === null || value === "") {
        return null;
    }

    const coordinate = Number(value);

    return Number.isFinite(coordinate) ? coordinate : null;
}
