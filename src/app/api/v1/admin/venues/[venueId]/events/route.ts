import { requireAdmin } from "@/modules/auth/auth.guard";
import { failure, readJson, success } from "@/modules/auth/auth.response";
import { EventService } from "@/modules/events/event.service";
import type { CreateEventDTO } from "@/modules/events/event.types";

interface RouteContext {
    params: Promise<{
        venueId: string;
    }>;
}

const eventService = new EventService();

export async function GET(request: Request, context: RouteContext) {
    try {
        await requireAdmin();
        const { venueId } = await context.params;
        const url = new URL(request.url);
        const data = await eventService.listVenueEvents(venueId, url.searchParams);

        return success(data);
    } catch (error) {
        return failure(error);
    }
}

export async function POST(request: Request, context: RouteContext) {
    try {
        await requireAdmin();
        const { venueId } = await context.params;
        const data = isMultipartRequest(request)
            ? await createEventFromMultipart(request, venueId)
            : await eventService.createVenueEvent(venueId, await readJson<CreateEventDTO>(request));

        return success(data, 201);
    } catch (error) {
        return failure(error);
    }
}

async function createEventFromMultipart(request: Request, venueId: string) {
    const formData = await request.formData();
    const payload = readPayload<CreateEventDTO>(formData);
    const files = readImageFiles(formData);
    const setThumbnail = readBooleanField(formData, "set_thumbnail");

    return eventService.createVenueEventWithPhotos(venueId, payload, files, {
        setThumbnail,
    });
}

function isMultipartRequest(request: Request) {
    return request.headers.get("content-type")?.includes("multipart/form-data") ?? false;
}

function readPayload<T>(formData: FormData): T {
    const value = formData.get("payload");

    if (typeof value !== "string") {
        throw new Error("Form field payload must be valid JSON");
    }

    return JSON.parse(value) as T;
}

function readImageFiles(formData: FormData) {
    return ["images", "images[]", "photos", "photos[]", "file"]
        .flatMap((key) => formData.getAll(key))
        .filter((value): value is File => value instanceof File && value.size > 0);
}

function readBooleanField(formData: FormData, key: string) {
    const value = formData.get(key);

    return typeof value === "string" ? value === "true" : undefined;
}
