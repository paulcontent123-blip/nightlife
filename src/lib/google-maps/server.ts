import { getGoogleMapsApiKey, mapsConfig } from "@/config/maps";

export interface GoogleMapsLocation {
    lat: number;
    lng: number;
}

export interface GeocodedAddress {
    formatted_address: string;
    place_id: string;
    location: GoogleMapsLocation;
}

export interface GooglePlaceDetails {
    place_id: string;
    name: string;
    formatted_address: string;
    location: GoogleMapsLocation;
    google_maps_url: string | null;
}

interface GoogleGeocodeResponse {
    status: string;
    error_message?: string;
    results: Array<{
        formatted_address: string;
        place_id: string;
        geometry: {
            location: GoogleMapsLocation;
        };
    }>;
}

interface GooglePlaceDetailsResponse {
    status: string;
    error_message?: string;
    result?: {
        place_id: string;
        name: string;
        formatted_address: string;
        url?: string;
        geometry: {
            location: GoogleMapsLocation;
        };
    };
}


//Hàm này dùng để đổi địa chỉ text thành tọa độ. Ví dụ admin nhập: 76A Lê Lai, Quận 1, TP.HCM
export async function geocodeAddress(address: string): Promise<GeocodedAddress | null> {
    const url = new URL(mapsConfig.geocodingUrl);
    url.searchParams.set("address", address);
    url.searchParams.set("language", mapsConfig.defaultLanguage);
    url.searchParams.set("region", mapsConfig.defaultRegion);
    url.searchParams.set("key", getGoogleMapsApiKey());

    const data = await fetchGoogleMaps<GoogleGeocodeResponse>(url);

    if (data.status === "ZERO_RESULTS") {
        return null;
    }

    assertGoogleMapsStatus(data.status, data.error_message);

    const result = data.results[0];

    if (!result) {
        return null;
    }

    return {
        formatted_address: result.formatted_address,
        place_id: result.place_id,
        location: result.geometry.location,
    };
}

//Hàm này lấy thông tin chi tiết của một địa điểm từ place_id.
export async function getPlaceDetails(placeId: string): Promise<GooglePlaceDetails | null> {
    const url = new URL(mapsConfig.placeDetailsUrl);
    url.searchParams.set("place_id", placeId);
    url.searchParams.set("fields", "place_id,name,formatted_address,geometry,url");
    url.searchParams.set("language", mapsConfig.defaultLanguage);
    url.searchParams.set("key", getGoogleMapsApiKey());

    const data = await fetchGoogleMaps<GooglePlaceDetailsResponse>(url);

    if (data.status === "NOT_FOUND" || data.status === "ZERO_RESULTS") {
        return null;
    }

    assertGoogleMapsStatus(data.status, data.error_message);

    if (!data.result) {
        return null;
    }

    return {
        place_id: data.result.place_id,
        name: data.result.name,
        formatted_address: data.result.formatted_address,
        location: data.result.geometry.location,
        google_maps_url: data.result.url ?? null,
    };
}

//Hàm này tạo link chỉ đường Google Maps từ tọa độ. 
//Dùng ở trang chi tiết venue để user bấm “Chỉ đường”.
export function createGoogleDirectionsUrl(location: GoogleMapsLocation) {
    const url = new URL("https://www.google.com/maps/dir/");
    url.searchParams.set("api", "1");
    url.searchParams.set("destination", `${location.lat},${location.lng}`);

    return url.toString();
}

//Hàm private dùng chung để gọi Google API bằng fetch.
async function fetchGoogleMaps<T>(url: URL): Promise<T> {
    const response = await fetch(url, {
        cache: "no-store",
    });

    if (!response.ok) {
        throw new Error(`Google Maps request failed with status ${response.status}`);
    }

    return response.json() as Promise<T>;
}

function assertGoogleMapsStatus(status: string, errorMessage?: string) {
    if (status !== "OK") {
        throw new Error(errorMessage ?? `Google Maps request failed with status ${status}`);
    }
}
