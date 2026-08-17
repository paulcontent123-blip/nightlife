import { requireAdmin } from "@/modules/auth/auth.guard";
import { AuthException } from "@/modules/auth/auth.errors";
import { failure, success } from "@/modules/auth/auth.response";
import { VenueService } from "@/modules/venues/venue.service";

interface RouteContext {
    params: Promise<{
        venueId: string;
    }>;
}

export const runtime = "nodejs";

const venueService = new VenueService();

export async function POST(request: Request, context: RouteContext) {
    try {
        await requireAdmin();
        const { venueId } = await context.params;
        const formData = await request.formData();
        const files = readVenuePhotoFiles(formData);
        const data = await venueService.uploadVenuePhotos(venueId, files, {
            replace: readBooleanFormValue(formData, "replace"),
            setThumbnail: readBooleanFormValue(formData, "set_thumbnail"),
        });

        return success(data, 201);
    } catch (error) {
        return failure(error);
    }
}

function readVenuePhotoFiles(formData: FormData): File[] {
    const supportedKeys = new Set(["images", "images[]", "photos", "photos[]", "file"]);
    const values = [...formData.entries()]
        .filter(([key]) => supportedKeys.has(key.trim()))
        .map(([, value]) => value);
    const files = values.filter((value): value is File => value instanceof File && value.size > 0);

    if (files.length === 0) {
        throw new AuthException(422, "INVALID_VENUE_IMAGE", "Upload at least one file using images, photos, or file");
    }

    return files;
}

function readBooleanFormValue(formData: FormData, key: string) {
    const value = formData.get(key);

    return typeof value === "string" && ["1", "true", "yes", "on"].includes(value.toLowerCase());
}
