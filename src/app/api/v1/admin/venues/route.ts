import { requireAdmin } from "@/modules/auth/auth.guard";
import { AuthException } from "@/modules/auth/auth.errors";
import { failure, readJson, success } from "@/modules/auth/auth.response";
import { VenueService } from "@/modules/venues/venue.service";
import type { CreateVenueDTO } from "@/modules/venues/venue.types";

export const runtime = "nodejs";

const venueService = new VenueService();

export async function POST(request: Request) {
    try {
        const admin = await requireAdmin();
        const data = isMultipartRequest(request)
            ? await createVenueFromFormData(request, admin.id)
            : await venueService.createVenue(await readJson<CreateVenueDTO>(request), admin.id);

        return success(data, 201);
    } catch (error) {
        return failure(error);
    }
}

export async function GET(request: Request) {
    try {
        await requireAdmin();
        const url = new URL(request.url);
        const data = await venueService.listAdminVenues(url.searchParams);

        return success(data);
    } catch (error) {
        return failure(error);
    }
}

async function createVenueFromFormData(request: Request, adminId: string) {
    const formData = await request.formData();
    const payload = readCreateVenuePayload(formData);
    const files = readVenuePhotoFiles(formData);

    return venueService.createVenueWithPhotos(payload, adminId, files, {
        setThumbnail: readBooleanFormValue(formData, "set_thumbnail", true),
    });
}

function readCreateVenuePayload(formData: FormData): CreateVenueDTO {
    const value = formData.get("payload") ?? formData.get("venue");

    if (typeof value !== "string") {
        throw new AuthException(400, "INVALID_JSON", "Form field payload must contain venue JSON");
    }

    try {
        return JSON.parse(value) as CreateVenueDTO;
    } catch {
        throw new AuthException(400, "INVALID_JSON", "Form field payload must be valid JSON");
    }
}

function readVenuePhotoFiles(formData: FormData): File[] {
    const supportedKeys = new Set(["images", "images[]", "photos", "photos[]", "file"]);
    const values = [...formData.entries()]
        .filter(([key]) => supportedKeys.has(key.trim()))
        .map(([, value]) => value);

    return values.filter((value): value is File => value instanceof File && value.size > 0);
}

function readBooleanFormValue(formData: FormData, key: string, defaultValue = false) {
    const value = formData.get(key);

    if (typeof value !== "string") {
        return defaultValue;
    }

    return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function isMultipartRequest(request: Request) {
    return request.headers.get("content-type")?.includes("multipart/form-data") ?? false;
}
