import { requireAdmin } from "@/modules/auth/auth.guard";
import { failure, readJson, success } from "@/modules/auth/auth.response";
import { EventService } from "@/modules/events/event.service";
import type { UpdateEventDTO } from "@/modules/events/event.types";

interface RouteContext {
    params: Promise<{
        venueId: string;
        eventId: string;
    }>;
}

const eventService = new EventService();

export async function GET(_request: Request, context: RouteContext) {
    try {
        await requireAdmin();
        const { venueId, eventId } = await context.params;
        const data = await eventService.getVenueEvent(venueId, eventId);

        return success(data);
    } catch (error) {
        return failure(error);
    }
}

export async function PUT(request: Request, context: RouteContext) {
    try {
        await requireAdmin();
        const { venueId, eventId } = await context.params;
        const data = isMultipartRequest(request)
            ? await updateEventFromMultipart(request, venueId, eventId)
            : await eventService.updateVenueEvent(venueId, eventId, await readJson<UpdateEventDTO>(request));

        return success(data);
    } catch (error) {
        return failure(error);
    }
}

export async function PATCH(request: Request, context: RouteContext) {
    try {
        await requireAdmin();
        const { venueId, eventId } = await context.params;
        const data = isMultipartRequest(request)
            ? await updateEventFromMultipart(request, venueId, eventId)
            : await eventService.updateVenueEvent(venueId, eventId, await readJson<UpdateEventDTO>(request));

        return success(data);
    } catch (error) {
        return failure(error);
    }
}

async function updateEventFromMultipart(request: Request, venueId: string, eventId: string) {
    const formData = await request.formData();
    const payload = readOptionalPayload<UpdateEventDTO>(formData);
    const files = readImageFiles(formData);

    return eventService.updateVenueEventWithPhotos(venueId, eventId, payload, files, {
        replaceImages: readBooleanField(formData, "replace"),
        setThumbnail: readBooleanField(formData, "set_thumbnail"),
        removeThumbnail: readBooleanField(formData, "remove_thumbnail"),
        deleteImages: readJsonArrayField(formData, "delete_images"),
    });
}

function isMultipartRequest(request: Request) {
    return request.headers.get("content-type")?.includes("multipart/form-data") ?? false;
}

function readOptionalPayload<T>(formData: FormData): T {
    const value = formData.get("payload");

    if (value === null) {
        return {} as T;
    }

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

function readJsonArrayField(formData: FormData, key: string) {
    const value = formData.get(key);

    if (typeof value !== "string" || value.trim().length === 0) {
        return undefined;
    }

    const parsed = JSON.parse(value);

    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : undefined;
}

export async function DELETE(_request: Request, context: RouteContext) {
    try {
        await requireAdmin();
        const { venueId, eventId } = await context.params;
        const data = await eventService.deleteVenueEvent(venueId, eventId);

        return success(data);
    } catch (error) {
        return failure(error);
    }
}
