import { requireAdmin } from "@/modules/auth/auth.guard";
import { AuthException } from "@/modules/auth/auth.errors";
import { failure, readJson, success } from "@/modules/auth/auth.response";
import { VenueService } from "@/modules/venues/venue.service";
import type { UpdateVenueDTO } from "@/modules/venues/venue.types";

interface RouteContext {
    params: Promise<{
        venueId: string;
    }>;
}

export const runtime = "nodejs";

const venueService = new VenueService();

export async function GET(_request: Request, context: RouteContext) {
    try {
        await requireAdmin();
        const { venueId } = await context.params;
        const data = await venueService.getAdminVenueById(venueId);

        return success(data);
    } catch (error) {
        return failure(error);
    }
}

export async function PUT(request: Request, context: RouteContext) {
    try {
        await requireAdmin();
        const { venueId } = await context.params;
        const data = await updateVenueFromRequest(request, venueId);

        return success(data);
    } catch (error) {
        return failure(error);
    }
}

export async function PATCH(request: Request, context: RouteContext) {
    try {
        await requireAdmin();
        const { venueId } = await context.params;
        const data = await updateVenueFromRequest(request, venueId);

        return success(data);
    } catch (error) {
        return failure(error);
    }
}

export async function DELETE(_request: Request, context: RouteContext) {
    try {
        await requireAdmin();
        const { venueId } = await context.params;
        const data = await venueService.deleteVenue(venueId);

        return success(data);
    } catch (error) {
        return failure(error);
    }
}

async function updateVenueFromRequest(request: Request, venueId: string) {
    if (!isMultipartRequest(request)) {
        const body = await readJson<UpdateVenueDTO>(request);

        return venueService.updateVenue(venueId, body);
    }

    const formData = await request.formData();

    return venueService.updateVenueWithPhotos(
        venueId,
        await readUpdateVenuePayload(formData),
        readVenuePhotoFiles(formData),
        {
            replaceImages: readBooleanFormValue(formData, "replace_images") || readBooleanFormValue(formData, "replace"),
            setThumbnail: readBooleanFormValue(formData, "set_thumbnail"),
            removeThumbnail: readBooleanFormValue(formData, "remove_thumbnail"),
            deleteImages: readStringArrayFormValue(formData, "delete_images"),
        }
    );
}

async function readUpdateVenuePayload(formData: FormData): Promise<UpdateVenueDTO> {
    const value = formData.get("payload") ?? formData.get("venue");

    if (!value) {
        return {};
    }

    const text = typeof value === "string"
        ? value
        : value instanceof File
            ? await value.text()
            : null;

    if (!text) {
        throw new AuthException(400, "INVALID_JSON", "Form field payload must contain venue JSON");
    }

    try {
        return JSON.parse(text) as UpdateVenueDTO;
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

function readStringArrayFormValue(formData: FormData, key: string) {
    const values = formData.getAll(key);
    const items: string[] = [];

    for (const value of values) {
        if (typeof value !== "string" || value.trim().length === 0) {
            continue;
        }

        const trimmedValue = value.trim();

        if (trimmedValue.startsWith("[")) {
            try {
                const parsedValue = JSON.parse(trimmedValue) as unknown;

                if (Array.isArray(parsedValue)) {
                    items.push(...parsedValue.filter((item): item is string => typeof item === "string"));
                }
            } catch {
                throw new AuthException(400, "INVALID_JSON", `${key} must be a valid JSON array`);
            }
        } else {
            items.push(trimmedValue);
        }
    }

    return items;
}

function readBooleanFormValue(formData: FormData, key: string) {
    const value = formData.get(key);

    return typeof value === "string" && ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function isMultipartRequest(request: Request) {
    return request.headers.get("content-type")?.includes("multipart/form-data") ?? false;
}
