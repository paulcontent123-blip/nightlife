import {
    deleteEventPhotoByUrl,
    readEventPhotoFingerprint,
    readEventPhotoFingerprintFromUrl,
    uploadEventPhoto,
} from "@/lib/cloudinary/event-photos";
import { AuthException } from "@/modules/auth/auth.errors";
import { VenueRepository } from "@/modules/venues/venue.repository";
import { EventRepository } from "./event.repository";
import {
    CreateEventSchema,
    EventListQuerySchema,
    UpdateEventSchema,
} from "./event.validator";
import type { CreateEventDTO, UpdateEventDTO } from "./event.types";

const MAX_EVENT_PHOTOS = 20;

export class EventService {
    constructor(
        private repository = new EventRepository(),
        private venueRepository = new VenueRepository()
    ) { }

    async listVenueEvents(venueId: string, searchParams: URLSearchParams) {
        await this.ensureVenueExists(venueId);

        const query = EventListQuerySchema.parse(Object.fromEntries(searchParams));

        return this.repository.listByVenue(venueId, query);
    }

    async listPublicEvents(searchParams: URLSearchParams) {
        const query = EventListQuerySchema.parse(Object.fromEntries(searchParams));

        return this.repository.listPublic(query);
    }

    async getPublicEventBySlug(slug: string) {
        const event = await this.repository.findPublicBySlug(slug);

        if (!event) {
            throw new AuthException(404, "EVENT_NOT_FOUND");
        }

        return event;
    }

    async listPublicVenueEvents(venueSlug: string, searchParams: URLSearchParams) {
        const venue = await this.venueRepository.findBySlug(venueSlug, true);

        if (!venue) {
            throw new AuthException(404, "VENUE_NOT_FOUND");
        }

        const query = EventListQuerySchema.parse(Object.fromEntries(searchParams));

        return this.repository.listPublicByVenue(venue.id, query);
    }

    async getVenueEvent(venueId: string, eventId: string) {
        await this.ensureVenueExists(venueId);

        const event = await this.repository.findById(venueId, eventId);

        if (!event) {
            throw new AuthException(404, "EVENT_NOT_FOUND");
        }

        return event;
    }

    async createVenueEvent(venueId: string, input: CreateEventDTO) {
        await this.ensureVenueExists(venueId);

        const dto = CreateEventSchema.parse(input);
        const slug = await this.createUniqueSlug(dto.slug ?? dto.title);

        return this.repository.create({
            slug,
            venue_id: venueId,
            title: dto.title,
            description: dto.description ?? null,
            event_date: dto.event_date,
            start_time: dto.start_time,
            end_time: dto.end_time ?? null,
            genre: dto.genre ?? [],
            lineup: dto.lineup ?? [],
            thumbnail_url: dto.thumbnail_url ?? null,
            images: dto.images ?? [],
            is_free: dto.is_free,
            age_restriction: dto.age_restriction,
            total_capacity: dto.total_capacity ?? null,
            is_active: dto.is_active,
        });
    }

    async createVenueEventWithPhotos(
        venueId: string,
        input: CreateEventDTO,
        files: File[],
        options: { setThumbnail?: boolean } = {}
    ) {
        const event = await this.createVenueEvent(venueId, input);

        if (files.length === 0) {
            return {
                event,
                uploaded: [],
            };
        }

        const uploadableFiles = await this.filterDuplicateEventPhotoFiles(files, event.media.images);

        if (event.media.images.length + uploadableFiles.length > MAX_EVENT_PHOTOS) {
            throw new AuthException(422, "INVALID_EVENT_IMAGE", `An event can have up to ${MAX_EVENT_PHOTOS} photos`);
        }

        const uploadedPhotos = await Promise.all(uploadableFiles.map((file) => uploadEventPhoto(event.id, file)));
        const uploadedUrls = uploadedPhotos.map((photo) => photo.url);
        const images = [...event.media.images, ...uploadedUrls];
        const thumbnailUrl = uploadedUrls[0] && (options.setThumbnail ?? true)
            ? uploadedUrls[0]
            : event.media.thumbnail_url;
        const updatedEvent = await this.repository.update(venueId, event.id, {
            images,
            thumbnail_url: thumbnailUrl,
        });

        return {
            event: updatedEvent,
            uploaded: uploadedPhotos,
        };
    }

    async updateVenueEvent(venueId: string, eventId: string, input: UpdateEventDTO) {
        await this.getVenueEvent(venueId, eventId);

        const dto = UpdateEventSchema.parse(input);
        const slug = dto.slug ? await this.createUniqueSlug(dto.slug, eventId) : undefined;

        return this.repository.update(venueId, eventId, {
            ...(slug ? { slug } : {}),
            ...(dto.title !== undefined ? { title: dto.title } : {}),
            ...(dto.description !== undefined ? { description: dto.description ?? null } : {}),
            ...(dto.event_date !== undefined ? { event_date: dto.event_date } : {}),
            ...(dto.start_time !== undefined ? { start_time: dto.start_time } : {}),
            ...(dto.end_time !== undefined ? { end_time: dto.end_time ?? null } : {}),
            ...(dto.genre !== undefined ? { genre: dto.genre } : {}),
            ...(dto.lineup !== undefined ? { lineup: dto.lineup } : {}),
            ...(dto.thumbnail_url !== undefined ? { thumbnail_url: dto.thumbnail_url ?? null } : {}),
            ...(dto.images !== undefined ? { images: dto.images } : {}),
            ...(dto.is_free !== undefined ? { is_free: dto.is_free } : {}),
            ...(dto.age_restriction !== undefined ? { age_restriction: dto.age_restriction } : {}),
            ...(dto.total_capacity !== undefined ? { total_capacity: dto.total_capacity ?? null } : {}),
            ...(dto.is_active !== undefined ? { is_active: dto.is_active } : {}),
        });
    }

    async updateVenueEventWithPhotos(
        venueId: string,
        eventId: string,
        input: UpdateEventDTO,
        files: File[],
        options: {
            replaceImages?: boolean;
            setThumbnail?: boolean;
            deleteImages?: string[];
            removeThumbnail?: boolean;
        } = {}
    ) {
        const event = await this.getVenueEvent(venueId, eventId);
        const dto = UpdateEventSchema.parse(input);
        const deletedImageUrls = new Set(options.deleteImages ?? []);
        const baseImages = options.replaceImages
            ? dto.images ?? []
            : dto.images ?? event.media.images;
        const existingImages = baseImages.filter((url) => !deletedImageUrls.has(url));
        const uploadableFiles = await this.filterDuplicateEventPhotoFiles(files, existingImages);

        if (existingImages.length + uploadableFiles.length > MAX_EVENT_PHOTOS) {
            throw new AuthException(422, "INVALID_EVENT_IMAGE", `An event can have up to ${MAX_EVENT_PHOTOS} photos`);
        }

        const uploadedPhotos = await Promise.all(uploadableFiles.map((file) => uploadEventPhoto(eventId, file)));
        const uploadedUrls = uploadedPhotos.map((photo) => photo.url);
        const images = [...existingImages, ...uploadedUrls];
        const thumbnailUrl = this.resolveUpdatedThumbnailUrl({
            currentThumbnailUrl: event.media.thumbnail_url,
            requestedThumbnailUrl: dto.thumbnail_url,
            images,
            uploadedUrls,
            deletedImageUrls,
            setThumbnail: options.setThumbnail,
            removeThumbnail: options.removeThumbnail,
        });
        const updatedEvent = await this.repository.update(venueId, eventId, {
            ...(dto.slug ? { slug: await this.createUniqueSlug(dto.slug, eventId) } : {}),
            ...(dto.title !== undefined ? { title: dto.title } : {}),
            ...(dto.description !== undefined ? { description: dto.description ?? null } : {}),
            ...(dto.event_date !== undefined ? { event_date: dto.event_date } : {}),
            ...(dto.start_time !== undefined ? { start_time: dto.start_time } : {}),
            ...(dto.end_time !== undefined ? { end_time: dto.end_time ?? null } : {}),
            ...(dto.genre !== undefined ? { genre: dto.genre } : {}),
            ...(dto.lineup !== undefined ? { lineup: dto.lineup } : {}),
            ...(dto.is_free !== undefined ? { is_free: dto.is_free } : {}),
            ...(dto.age_restriction !== undefined ? { age_restriction: dto.age_restriction } : {}),
            ...(dto.total_capacity !== undefined ? { total_capacity: dto.total_capacity ?? null } : {}),
            ...(dto.is_active !== undefined ? { is_active: dto.is_active } : {}),
            images,
            thumbnail_url: thumbnailUrl,
        });

        await this.deleteUnreferencedEventPhotos(
            [...event.media.images, event.media.thumbnail_url].filter((url): url is string => Boolean(url)),
            [...images, thumbnailUrl].filter((url): url is string => Boolean(url))
        );

        return {
            event: updatedEvent,
            uploaded: uploadedPhotos,
        };
    }

    async deleteVenueEvent(venueId: string, eventId: string) {
        const event = await this.getVenueEvent(venueId, eventId);
        const deletedEvent = await this.repository.softDelete(venueId, eventId);

        await this.deleteUnreferencedEventPhotos(
            [...event.media.images, event.media.thumbnail_url].filter((url): url is string => Boolean(url)),
            []
        );

        return deletedEvent;
    }

    private async ensureVenueExists(venueId: string) {
        const venue = await this.venueRepository.findById(venueId);

        if (!venue) {
            throw new AuthException(404, "VENUE_NOT_FOUND");
        }
    }

    private async createUniqueSlug(value: string, excludeEventId?: string) {
        const baseSlug = this.slugify(value);
        let slug = baseSlug;
        let suffix = 1;

        while (await this.repository.slugExists(slug, excludeEventId)) {
            suffix += 1;
            slug = `${baseSlug}-${suffix}`;
        }

        return slug;
    }

    private resolveUpdatedThumbnailUrl(input: {
        currentThumbnailUrl: string | null;
        requestedThumbnailUrl?: string | null;
        images: string[];
        uploadedUrls: string[];
        deletedImageUrls: Set<string>;
        setThumbnail?: boolean;
        removeThumbnail?: boolean;
    }) {
        if (input.removeThumbnail) {
            return input.images[0] ?? null;
        }

        if (input.setThumbnail && input.uploadedUrls[0]) {
            return input.uploadedUrls[0];
        }

        if (input.requestedThumbnailUrl !== undefined) {
            return input.requestedThumbnailUrl;
        }

        if (input.currentThumbnailUrl && !input.deletedImageUrls.has(input.currentThumbnailUrl)) {
            return input.currentThumbnailUrl;
        }

        return input.images[0] ?? null;
    }

    private async deleteUnreferencedEventPhotos(previousUrls: string[], nextUrls: string[]) {
        const nextUrlSet = new Set(nextUrls);
        const removedUrls = [...new Set(previousUrls.filter((url) => !nextUrlSet.has(url)))];

        await Promise.all(removedUrls.map((url) => deleteEventPhotoByUrl(url)));
    }

    private async filterDuplicateEventPhotoFiles(files: File[], existingImageUrls: string[]) {
        const existingFingerprints = new Set(
            existingImageUrls
                .map(readEventPhotoFingerprintFromUrl)
                .filter((fingerprint): fingerprint is string => Boolean(fingerprint))
        );
        const nextFingerprints = new Set<string>();
        const uploadableFiles: File[] = [];

        for (const file of files) {
            const fingerprint = await readEventPhotoFingerprint(file);

            if (existingFingerprints.has(fingerprint) || nextFingerprints.has(fingerprint)) {
                continue;
            }

            nextFingerprints.add(fingerprint);
            uploadableFiles.push(file);
        }

        return uploadableFiles;
    }

    private slugify(value: string) {
        return value
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
            .slice(0, 180) || "event";
    }
}
