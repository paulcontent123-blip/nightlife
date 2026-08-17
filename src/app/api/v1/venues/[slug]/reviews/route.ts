import { requireAuth } from "@/modules/auth/auth.guard";
import { AuthException } from "@/modules/auth/auth.errors";
import { failure, readJson, success } from "@/modules/auth/auth.response";
import { VenueReviewService } from "@/modules/venue-reviews/venue-review.service";
import type { CreateVenueReviewDTO } from "@/modules/venue-reviews/venue-review.types";

interface RouteContext {
    params: Promise<{
        slug: string;
    }>;
}

const venueReviewService = new VenueReviewService();

export const runtime = "nodejs";

export async function GET(request: Request, context: RouteContext) {
    try {
        const { slug } = await context.params;
        const url = new URL(request.url);
        const data = await venueReviewService.listVenueReviews(slug, url.searchParams);

        return success(data);
    } catch (error) {
        return failure(error);
    }
}

export async function POST(request: Request, context: RouteContext) {
    try {
        const user = await requireAuth();
        const { slug } = await context.params;
        const data = isMultipartRequest(request)
            ? await createVenueReviewFromFormData(request, slug, user)
            : await venueReviewService.createVenueReview(
                slug,
                await readJson<CreateVenueReviewDTO>(request),
                user
            );

        return success(data, 201);
    } catch (error) {
        return failure(error);
    }
}

async function createVenueReviewFromFormData(
    request: Request,
    slug: string,
    user: Awaited<ReturnType<typeof requireAuth>>
) {
    const formData = await request.formData();
    const payload = await readReviewPayload(formData);
    const files = readReviewImageFiles(formData);

    return venueReviewService.createVenueReviewWithImages(slug, payload, user, files);
}

async function readReviewPayload(formData: FormData): Promise<CreateVenueReviewDTO> {
    const value = formData.get("payload") ?? formData.get("review");

    if (!value) {
        throw new AuthException(400, "INVALID_JSON", "Form field payload must contain review JSON");
    }

    const text = typeof value === "string"
        ? value
        : value instanceof File
            ? await value.text()
            : null;

    if (!text) {
        throw new AuthException(400, "INVALID_JSON", "Form field payload must contain review JSON");
    }

    try {
        return JSON.parse(text) as CreateVenueReviewDTO;
    } catch {
        throw new AuthException(400, "INVALID_JSON", "Form field payload must be valid JSON");
    }
}

function readReviewImageFiles(formData: FormData): File[] {
    const supportedKeys = new Set(["images", "images[]", "photos", "photos[]", "file"]);
    const values = [...formData.entries()]
        .filter(([key]) => supportedKeys.has(key.trim()))
        .map(([, value]) => value);

    return values.filter((value): value is File => value instanceof File && value.size > 0);
}

function isMultipartRequest(request: Request) {
    return request.headers.get("content-type")?.includes("multipart/form-data") ?? false;
}
