const GOOGLE_MAPS_BASE_URL = "https://maps.googleapis.com/maps/api";

export const mapsConfig = {
    apiKey: process.env.GOOGLE_MAPS_API_KEY,
    geocodingUrl: `${GOOGLE_MAPS_BASE_URL}/geocode/json`,
    placeDetailsUrl: `${GOOGLE_MAPS_BASE_URL}/place/details/json`,
    defaultLanguage: "vi",
    defaultRegion: "vn",
} as const;

export function getGoogleMapsApiKey() {
    if (!mapsConfig.apiKey) {
        throw new Error("Missing GOOGLE_MAPS_API_KEY environment variable");
    }

    return mapsConfig.apiKey;
}
