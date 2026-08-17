import { geocodeAddress, getPlaceDetails } from "@/lib/google-maps/server";
import {
    deleteVenuePhotoByUrl,
    readVenuePhotoFingerprint,
    readVenuePhotoFingerprintFromUrl,
    uploadVenuePhoto,
} from "@/lib/cloudinary/venue-photos";
import { redisJsonGet, redisJsonSet } from "@/lib/redis/server";
import { logBookingLifecycle } from "@/lib/logger/booking-lifecycle";
import { AuthException } from "@/modules/auth/auth.errors";
import {
    assertWithinPriorityBookingWindow,
} from "@/modules/membership/priority-booking";
import {
    CreateVenueSchema,
    UpdateVenueSchema,
    VenueAvailabilityQuerySchema,
    VenueListQuerySchema,
    VenueNearbyQuerySchema,
} from "./venue.validator";
import { VenueRepository } from "./venue.repository";
import { mapVenue } from "./venue.mapper";
import {
    incrementVenueListCacheVersion,
    readVenueAvailabilityCacheVersion,
    readVenueListCacheVersion,
} from "./venue-cache";
import type {
    CreateVenueDTO,
    UpdateVenueDTO,
    VenueAddressPayload,
    VenueAvailabilityQuery,
    VenueAvailabilityResult,
    VenueCity,
    VenueListQuery,
    VenueNearbyQuery,
    VenueNearbyResult,
} from "./venue.types";

const DEFAULT_VENUE_ADDRESS: VenueAddressPayload = {
    address: "Ho Chi Minh City, Vietnam",
    district: "Q1",
    city: "hcm",
    lat: 10.7769,
    lng: 106.7009,
};

const CACHE_TTL_SECONDS = 300;
const DEFAULT_TIME_SLOTS = ["18:00", "19:00", "20:00", "21:00", "22:00", "23:00"];
const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
const MAX_VENUE_PHOTOS = 20;
const EARTH_RADIUS_METERS = 6_371_000;

export class VenueService {
    constructor(private repository = new VenueRepository()) { }

    //lấy danh sách venue cho người dùng public, có filter, sort, phân trang và cache Redis.
    async listPublicVenues(searchParams: URLSearchParams) {
        const query = VenueListQuerySchema.parse(Object.fromEntries(searchParams));
        const cacheVersion = await readVenueListCacheVersion();
        const cacheKey = this.createVenueListCacheKey(cacheVersion, query);
        const cachedResult = await this.readCache<Awaited<ReturnType<VenueRepository["listVenues"]>>>(cacheKey);

        if (cachedResult) {
            return cachedResult;
        }

        const result = await this.repository.listVenues(query, true);

        await this.writeCache(cacheKey, result);

        return result;
    }

    //lấy danh sách venue cho admin, có thể xem cả venue đang inactive.
    async listAdminVenues(searchParams: URLSearchParams) {
        const query = VenueListQuerySchema.parse(Object.fromEntries(searchParams));

        return this.repository.listVenues(query, false);
    }

    //tìm venue gần vị trí hiện tại dựa trên venues.lat và venues.lng, sau đó tính khoảng cách bằng công thức Haversine.
    async listNearbyVenues(
        searchParams: URLSearchParams
    ): Promise<VenueNearbyResult<ReturnType<typeof mapVenue>>> {
        const query = VenueNearbyQuerySchema.parse(Object.fromEntries(searchParams));
        const from = (query.page - 1) * query.limit;
        const to = from + query.limit;
        const candidates = await this.repository.listNearbyCandidates(query);
        const venues = candidates
            .flatMap((row) => {
                const lat = Number(row.lat);
                const lng = Number(row.lng);

                if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
                    return [];
                }

                const distanceInMeters = calculateDistanceInMeters(query, { lat, lng });

                if (distanceInMeters > query.radius) {
                    return [];
                }

                const meters = Math.round(distanceInMeters);

                return [{
                    ...mapVenue(row),
                    distance: {
                        meters,
                        kilometers: Number((meters / 1000).toFixed(2)),
                    },
                }];
            })
            .sort((left, right) => left.distance.meters - right.distance.meters);

        return {
            items: venues.slice(from, to),
            pagination: {
                page: query.page,
                limit: query.limit,
                total: venues.length,
                total_pages: Math.ceil(venues.length / query.limit),
            },
            search: {
                lat: query.lat,
                lng: query.lng,
                radius: query.radius,
            },
        };
    }

    //lấy venue public theo slug, chỉ trả venue đang active.
    async getPublicVenueBySlug(slug: string) {
        const venue = await this.repository.findBySlug(slug, true);

        if (!venue) {
            throw new AuthException(404, "VENUE_NOT_FOUND");
        }

        return venue;
    }

    //lấy chi tiết venue public theo slug, bao gồm thông tin venue, bàn, chương trình khuyến mãi và đánh giá gần đây.
    async getPublicVenueDetailBySlug(slug: string, includeExclusiveDeals = false) {
        const venue = await this.getPublicVenueBySlug(slug);
        const [tables, deals, reviews] = await Promise.all([
            this.repository.listActiveTables(venue.id),
            this.repository.listActiveDeals(venue.id, includeExclusiveDeals),
            this.repository.listRecentReviews(venue.id),
        ]);

        return {
            ...venue,
            tables: tables.map((table) => ({
                id: table.id,
                table_name: table.table_name,
                type: table.type,
                capacity: table.capacity,
                min_spend: table.min_spend,
                deposit_required: table.deposit_required,
                is_active: table.is_active,
            })),
            deals: deals.map((deal) => ({
                id: deal.id,
                title: deal.title,
                description: deal.description,
                discount_type: deal.discount_type,
                discount_value: deal.discount_value,
                applicable_days: deal.applicable_days ?? [],
                start_time: deal.start_time,
                end_time: deal.end_time,
                conditions: deal.conditions,
                is_exclusive: deal.is_exclusive,
                valid_until: deal.valid_until,
                created_at: deal.created_at,
            })),
            reviews: reviews.map((review) => ({
                id: review.id,
                rating: review.rating,
                atmosphere_rating: review.atmosphere_rating,
                service_rating: review.service_rating,
                value_rating: review.value_rating,
                content: review.content,
                visited_date: review.visited_date,
                images: review.images ?? [],
                is_verified_visit: review.is_verified_visit,
                helpful_count: review.helpful_count,
                created_at: review.created_at,
            })),
        };
    }

    // kiểm tra bàn còn trống theo date và party_size, trả về danh sách bàn phù hợp và khung giờ còn chỗ, có cache Redis TTL 5 phút.
    async getVenueAvailability(
        slug: string,
        searchParams: URLSearchParams,
        perks: {
            priorityBookingHours?: number;
            guaranteedVipTable?: boolean;
            conciergeHotline?: string | null;
        } = {}
    ): Promise<VenueAvailabilityResult> {
        const query = VenueAvailabilityQuerySchema.parse(Object.fromEntries(searchParams));
        const priorityBookingHours = perks.priorityBookingHours ?? 0;
        const guaranteedVipTable = perks.guaranteedVipTable === true;
        const bookingWindow = assertWithinPriorityBookingWindow(query.date, priorityBookingHours);
        logBookingLifecycle("availability_check_requested", {
            venue_slug: slug,
            date: query.date,
            party_size: query.party_size,
            priority_booking_hours: priorityBookingHours,
            guaranteed_vip_table: guaranteedVipTable,
        });

        const venue = await this.getPublicVenueBySlug(slug);
        const cacheVersion = await readVenueAvailabilityCacheVersion(venue.id);
        const cacheKey = this.createAvailabilityCacheKey(
            venue.id,
            cacheVersion,
            slug,
            query,
            priorityBookingHours,
            guaranteedVipTable
        );
        const cachedResult = await this.readCache<VenueAvailabilityResult>(cacheKey);

        if (cachedResult) {
            logBookingLifecycle("availability_check_cache_hit", {
                venue_id: venue.id,
                venue_slug: slug,
                date: query.date,
                party_size: query.party_size,
                available_tables: cachedResult.tables.length,
                time_slots: cachedResult.time_slots.length,
            });

            return cachedResult;
        }

        logBookingLifecycle("availability_check_cache_miss", {
            venue_id: venue.id,
            venue_slug: slug,
            date: query.date,
            party_size: query.party_size,
        });

        const tables = await this.repository.listEligibleTables(venue.id, query.party_size);
        const bookings = await this.repository.listBlockingBookings(venue.id, query);
        const bookedTableIdsByTime = new Map<string, Set<string>>();
        const vipTableIds = new Set(
            tables
                .filter((table) => table.type.toLowerCase() === "vip")
                .map((table) => table.id)
        );

        for (const booking of bookings) {
            if (!booking.table_id) {
                continue;
            }

            const time = this.normalizeBookingTime(booking.booking_time);
            const bookedTableIds = bookedTableIdsByTime.get(time) ?? new Set<string>();

            bookedTableIds.add(booking.table_id);
            bookedTableIdsByTime.set(time, bookedTableIds);
        }

        const timeSlots = this.createAvailabilitySlots(venue.operations.open_hours, query.date).map((time) => {
            const bookedTableIds = bookedTableIdsByTime.get(time) ?? new Set<string>();
            const availableTableIds = tables
                .filter((table) => !bookedTableIds.has(table.id))
                .map((table) => table.id);

            return {
                time,
                available_table_count: availableTableIds.length,
                available_table_ids: availableTableIds,
            };
        });

        const result: VenueAvailabilityResult = {
            venue: {
                id: venue.id,
                slug: venue.slug,
                name: venue.name,
            },
            date: query.date,
            party_size: query.party_size,
            tables: tables.map((table) => ({
                id: table.id,
                table_name: table.table_name,
                type: table.type,
                capacity: table.capacity,
                min_spend: table.min_spend,
                deposit_required: table.deposit_required,
            })),
            time_slots: timeSlots,
            booking_window: bookingWindow,
            guaranteed_vip: this.createGuaranteedVipAvailability({
                eligible: guaranteedVipTable,
                hasAvailableVipTable: timeSlots.some((slot) =>
                    slot.available_table_ids.some((tableId) => vipTableIds.has(tableId))
                ),
                conciergeHotline: perks.conciergeHotline ?? null,
            }),
            cache: {
                ttl: CACHE_TTL_SECONDS,
            },
        };

        await this.writeCache(cacheKey, result);
        logBookingLifecycle("availability_check_completed", {
            venue_id: venue.id,
            venue_slug: slug,
            date: query.date,
            party_size: query.party_size,
            eligible_tables: tables.length,
            blocking_bookings: bookings.length,
            time_slots: result.time_slots.length,
        });

        return result;
    }

    private createGuaranteedVipAvailability(input: {
        eligible: boolean;
        hasAvailableVipTable: boolean;
        conciergeHotline: string | null;
    }) {
        if (!input.eligible) {
            return {
                eligible: false,
                available: false,
                action: "none" as const,
                concierge_hotline: null,
                message: null,
            };
        }

        if (input.hasAvailableVipTable) {
            return {
                eligible: true,
                available: true,
                action: "none" as const,
                concierge_hotline: input.conciergeHotline,
                message: "VIP table options are available for this request.",
            };
        }

        return {
            eligible: true,
            available: false,
            action: "contact_concierge" as const,
            concierge_hotline: input.conciergeHotline,
            message: "No VIP table is currently available. Contact concierge so operations can offer an alternative.",
        };
    }

    // Admin lookup by id; used before update/delete/photo actions to ensure the venue exists.
    async getAdminVenueById(id: string) {
        const venue = await this.repository.findById(id);

        if (!venue) {
            throw new AuthException(404, "VENUE_NOT_FOUND");
        }

        return venue;
    }

    // admin tạo venue mới, validate payload, xử lý địa chỉ, tạo slug unique, lưu DB, set is_verified=true, is_active=true, rồi invalidate cache venue list.
    async createVenue(input: CreateVenueDTO, adminId: string) {
        const dto = CreateVenueSchema.parse(input);
        const address = await this.resolveVenueAddress(dto.address);
        const slug = await this.createUniqueSlug(dto.basic.slug ?? dto.basic.name);
        const images = dto.media?.images ?? [];
        const thumbnailUrl = dto.media?.thumbnail_url ?? images[0] ?? null;

        const venue = await this.repository.createVenue({
            slug,
            owner_id: adminId,
            name: dto.basic.name,
            type: dto.basic.type,
            description: dto.basic.description ?? null,
            address: address.address,
            district: address.district,
            city: address.city,
            lat: address.lat,
            lng: address.lng,
            phone: dto.basic.phone ?? null,
            website: dto.basic.website ?? null,
            instagram: dto.basic.instagram ?? null,
            cover_charge: dto.pricing?.cover_charge ?? 0,
            price_range: dto.pricing?.price_range ?? "$$",
            capacity: dto.pricing?.capacity ?? null,
            min_spend: dto.pricing?.min_spend ?? null,
            dress_code: dto.pricing?.dress_code ?? null,
            age_restriction: dto.pricing?.age_restriction ?? 18,
            open_hours: dto.operations?.open_hours ?? null,
            features: dto.features ?? [],
            thumbnail_url: thumbnailUrl,
            images,
            is_verified: true,
            is_active: true,
            is_vip_only: dto.operations?.is_vip_only ?? false,
            subscription_tier: dto.operations?.subscription_tier ?? "basic",
        });

        await incrementVenueListCacheVersion();

        return venue;
    }

    // tạo venue kèm upload ảnh lên Cloudinary trong cùng một request multipart.
    async createVenueWithPhotos(
        input: CreateVenueDTO,
        adminId: string,
        files: File[],
        options: { setThumbnail?: boolean } = {}
    ) {
        const venue = await this.createVenue(input, adminId);

        if (files.length === 0) {
            return {
                venue,
                uploaded: [],
            };
        }

        const uploadResult = await this.uploadVenuePhotos(venue.id, files, {
            replace: false,
            setThumbnail: options.setThumbnail ?? true,
        });

        return uploadResult;
    }

    // cập nhật thông tin venue bằng JSON, không upload file ảnh.
    async updateVenue(id: string, input: UpdateVenueDTO) {
        await this.getAdminVenueById(id);

        const dto = UpdateVenueSchema.parse(input);
        const updatePayload = await this.createUpdatePayload(dto);

        const venue = await this.repository.updateVenue(id, updatePayload);

        await incrementVenueListCacheVersion();

        return venue;
    }

    // cập nhật venue kèm upload/xóa/thay ảnh, xử lý lại images và thumbnail_url, đồng thời xóa ảnh Cloudinary không còn dùng.
    async updateVenueWithPhotos(
        id: string,
        input: UpdateVenueDTO,
        files: File[],
        options: {
            replaceImages?: boolean;
            setThumbnail?: boolean;
            deleteImages?: string[];
            removeThumbnail?: boolean;
        } = {}
    ) {
        const venue = await this.getAdminVenueById(id);
        const dto = UpdateVenueSchema.parse(input);
        const updatePayload = await this.createUpdatePayload(dto);
        const requestedImages = dto.media?.images;
        const deletedImageUrls = new Set(options.deleteImages ?? []);
        const baseImages = options.replaceImages
            ? requestedImages ?? []
            : requestedImages ?? venue.media.images;
        const existingImages = baseImages.filter((url) => !deletedImageUrls.has(url));

        const uploadableFiles = await this.filterDuplicateVenuePhotoFiles(files, existingImages);

        if (existingImages.length + uploadableFiles.length > MAX_VENUE_PHOTOS) {
            throw new AuthException(422, "INVALID_VENUE_IMAGE", `A venue can have up to ${MAX_VENUE_PHOTOS} photos`);
        }

        const uploadedPhotos = await Promise.all(uploadableFiles.map((file) => uploadVenuePhoto(id, file)));
        const uploadedUrls = uploadedPhotos.map((photo) => photo.url);
        const images = [...existingImages, ...uploadedUrls];
        const thumbnailUrl = this.resolveUpdatedThumbnailUrl({
            currentThumbnailUrl: venue.media.thumbnail_url,
            requestedThumbnailUrl: dto.media?.thumbnail_url,
            images,
            uploadedUrls,
            deletedImageUrls,
            setThumbnail: options.setThumbnail,
            removeThumbnail: options.removeThumbnail,
        });
        const updatedVenue = await this.repository.updateVenue(id, {
            ...updatePayload,
            images,
            thumbnail_url: thumbnailUrl,
        });

        await incrementVenueListCacheVersion();

        await this.deleteUnreferencedVenuePhotos(
            [...venue.media.images, venue.media.thumbnail_url].filter((url): url is string => Boolean(url)),
            [...images, thumbnailUrl].filter((url): url is string => Boolean(url))
        );

        return {
            venue: updatedVenue,
            uploaded: uploadedPhotos,
        };
    }

    // Admin uploads photos to an existing venue and updates image URLs in the database.
    async uploadVenuePhotos(
        id: string,
        files: File[],
        options: { replace?: boolean; setThumbnail?: boolean } = {}
    ) {
        const venue = await this.getAdminVenueById(id);

        if (files.length === 0) {
            throw new AuthException(422, "INVALID_VENUE_IMAGE", "At least one venue photo is required");
        }

        const existingImages = options.replace ? [] : venue.media.images;

        const uploadableFiles = await this.filterDuplicateVenuePhotoFiles(files, existingImages);

        if (existingImages.length + uploadableFiles.length > MAX_VENUE_PHOTOS) {
            throw new AuthException(422, "INVALID_VENUE_IMAGE", `A venue can have up to ${MAX_VENUE_PHOTOS} photos`);
        }

        const uploadedPhotos = await Promise.all(uploadableFiles.map((file) => uploadVenuePhoto(id, file)));
        const uploadedUrls = uploadedPhotos.map((photo) => photo.url);
        const images = [...existingImages, ...uploadedUrls];
        const thumbnailUrl = uploadedUrls[0] && (options.setThumbnail || !venue.media.thumbnail_url)
            ? uploadedUrls[0]
            : venue.media.thumbnail_url;
        const updatedVenue = await this.repository.updateVenue(id, {
            images,
            thumbnail_url: thumbnailUrl,
        });

        await incrementVenueListCacheVersion();

        return {
            venue: updatedVenue,
            uploaded: uploadedPhotos,
        };
    }

    // Admin soft-deletes a venue by marking it inactive instead of removing the row.
    async deleteVenue(id: string) {
        await this.getAdminVenueById(id);

        const venue = await this.repository.softDeleteVenue(id);

        await incrementVenueListCacheVersion();

        return venue;
    }

    // chỉ tạo object update cho field nào được gửi lên, field không gửi thì giữ nguyên.
    private async createUpdatePayload(input: UpdateVenueDTO) {
        const address = input.address ? await this.resolveVenueAddress(input.address) : null;
        const nextSlug = input.basic?.slug ?? input.basic?.name;
        const slug = nextSlug ? await this.createUniqueSlug(nextSlug) : undefined;

        return {
            ...(slug ? { slug } : {}),
            ...(input.basic?.name ? { name: input.basic.name } : {}),
            ...(input.basic?.type ? { type: input.basic.type } : {}),
            ...(input.basic?.description !== undefined ? { description: input.basic.description ?? null } : {}),
            ...(input.basic?.phone !== undefined ? { phone: input.basic.phone ?? null } : {}),
            ...(input.basic?.website !== undefined ? { website: input.basic.website ?? null } : {}),
            ...(input.basic?.instagram !== undefined ? { instagram: input.basic.instagram ?? null } : {}),
            ...(address ? {
                address: address.address,
                district: address.district,
                city: address.city,
                lat: address.lat,
                lng: address.lng,
            } : {}),
            ...(input.pricing?.cover_charge !== undefined ? { cover_charge: input.pricing.cover_charge } : {}),
            ...(input.pricing?.price_range ? { price_range: input.pricing.price_range } : {}),
            ...(input.pricing?.capacity !== undefined ? { capacity: input.pricing.capacity ?? null } : {}),
            ...(input.pricing?.min_spend !== undefined ? { min_spend: input.pricing.min_spend ?? null } : {}),
            ...(input.pricing?.dress_code !== undefined ? { dress_code: input.pricing.dress_code ?? null } : {}),
            ...(input.pricing?.age_restriction !== undefined ? { age_restriction: input.pricing.age_restriction } : {}),
            ...(input.operations?.open_hours !== undefined ? { open_hours: input.operations.open_hours ?? null } : {}),
            ...(input.operations?.is_vip_only !== undefined ? { is_vip_only: input.operations.is_vip_only } : {}),
            ...(input.operations?.subscription_tier ? { subscription_tier: input.operations.subscription_tier } : {}),
            ...(input.operations?.is_active !== undefined ? { is_active: input.operations.is_active } : {}),
            ...(input.operations?.is_verified !== undefined ? { is_verified: input.operations.is_verified } : {}),
            ...(input.media?.thumbnail_url !== undefined ? { thumbnail_url: input.media.thumbnail_url ?? null } : {}),
            ...(input.media?.images !== undefined ? { images: input.media.images ?? [] } : {}),
            ...(input.features !== undefined ? { features: input.features } : {}),
        };
    }

    // Chooses the next thumbnail based on explicit removal, uploaded files, or existing data.
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

    // Deletes Cloudinary photos that are no longer referenced by the updated venue record.
    private async deleteUnreferencedVenuePhotos(previousUrls: string[], nextUrls: string[]) {
        const nextUrlSet = new Set(nextUrls);
        const removedUrls = [...new Set(previousUrls.filter((url) => !nextUrlSet.has(url)))];

        await Promise.all(removedUrls.map((url) => deleteVenuePhotoByUrl(url)));
    }

    // Skips duplicate image files by comparing content fingerprints with existing URLs.
    private async filterDuplicateVenuePhotoFiles(files: File[], existingImageUrls: string[]) {
        const existingFingerprints = new Set(
            existingImageUrls
                .map(readVenuePhotoFingerprintFromUrl)
                .filter((fingerprint): fingerprint is string => Boolean(fingerprint))
        );
        const nextFingerprints = new Set<string>();
        const uploadableFiles: File[] = [];

        for (const file of files) {
            const fingerprint = await readVenuePhotoFingerprint(file);

            if (existingFingerprints.has(fingerprint) || nextFingerprints.has(fingerprint)) {
                continue;
            }

            nextFingerprints.add(fingerprint);
            uploadableFiles.push(file);
        }

        return uploadableFiles;
    }

    // xử lý địa chỉ venue từ Google Place ID, address thường, lat/lng thủ công, marker kéo trên bản đồ, hoặc dùng địa chỉ mặc định.
    private async resolveVenueAddress(address: CreateVenueDTO["address"]): Promise<VenueAddressPayload> {
        if (!address) {
            return DEFAULT_VENUE_ADDRESS;
        }

        const markerLat = address.marker_lat;
        const markerLng = address.marker_lng;

        if (markerLat !== undefined && markerLng !== undefined && !address.address && !address.google_place_id) {
            return {
                ...DEFAULT_VENUE_ADDRESS,
                district: address.district ?? DEFAULT_VENUE_ADDRESS.district,
                city: address.city ?? DEFAULT_VENUE_ADDRESS.city,
                lat: markerLat,
                lng: markerLng,
            };
        }

        if (address.address && address.lat !== undefined && address.lng !== undefined) {
            return {
                address: address.address,
                district: address.district ?? null,
                city: address.city ?? this.inferCity(address.address),
                lat: markerLat ?? address.lat,
                lng: markerLng ?? address.lng,
            };
        }

        if (address.google_place_id) {
            const place = await getPlaceDetails(address.google_place_id);

            if (!place) {
                throw new AuthException(422, "INVALID_JSON", "Place details could not be resolved");
            }

            return {
                address: address.address ?? place.formatted_address,
                district: address.district ?? null,
                city: address.city ?? this.inferCity(place.formatted_address),
                lat: markerLat ?? address.lat ?? place.location.lat,
                lng: markerLng ?? address.lng ?? place.location.lng,
            };
        }

        if (!address.address) {
            return {
                ...DEFAULT_VENUE_ADDRESS,
                district: address.district ?? DEFAULT_VENUE_ADDRESS.district,
                city: address.city ?? DEFAULT_VENUE_ADDRESS.city,
                lat: markerLat ?? address.lat ?? DEFAULT_VENUE_ADDRESS.lat,
                lng: markerLng ?? address.lng ?? DEFAULT_VENUE_ADDRESS.lng,
            };
        }

        const geocodedAddress = await geocodeAddress(address.address!);

        if (!geocodedAddress) {
            throw new AuthException(422, "INVALID_JSON", "Address could not be geocoded");
        }

        return {
            address: address.address ?? geocodedAddress.formatted_address,
            district: address.district ?? null,
            city: address.city ?? this.inferCity(geocodedAddress.formatted_address),
            lat: markerLat ?? address.lat ?? geocodedAddress.location.lat,
            lng: markerLng ?? address.lng ?? geocodedAddress.location.lng,
        };
    }

    // tạo slug không trùng.
    private async createUniqueSlug(value: string) {
        const baseSlug = this.slugify(value);
        let slug = baseSlug;
        let suffix = 1;

        while (await this.repository.slugExists(slug)) {
            suffix += 1;
            slug = `${baseSlug}-${suffix}`;
        }

        return slug;
    }

    // chuyển tên venue thành slug URL.
    private slugify(value: string) {
        return value
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
            .slice(0, 180) || "venue";
    }

    // Infers supported city code from a formatted address, defaulting to HCM.
    private inferCity(address: string): VenueCity {
        const normalizedAddress = address.toLowerCase();

        if (normalizedAddress.includes("hà nội") || normalizedAddress.includes("ha noi")) {
            return "hanoi";
        }

        if (normalizedAddress.includes("đà nẵng") || normalizedAddress.includes("da nang")) {
            return "danang";
        }

        return "hcm";
    }

    // tạo Redis cache key cho danh sách venue.
    private createVenueListCacheKey(version: number, query: VenueListQuery) {
        return `cache:venues:list:v${version}:${JSON.stringify({
            ...query,
            features: query.features ? [...query.features].sort() : undefined,
        })}`;
    }

    // tạo Redis cache key cho availability.
    private createAvailabilityCacheKey(
        venueId: string,
        version: number,
        slug: string,
        query: VenueAvailabilityQuery,
        priorityBookingHours: number,
        guaranteedVipTable: boolean
    ) {
        return `cache:venues:availability:${venueId}:v${version}:${slug}:${query.date}:${query.party_size}:priority:${priorityBookingHours}:guaranteed:${guaranteedVipTable}`;
    }

    // Reads JSON from Redis; cache errors are treated as cache misses.
    private async readCache<T>(key: string): Promise<T | null> {
        try {
            return await redisJsonGet<T>(key);
        } catch {
            return null;
        }
    }

    // Writes JSON to Redis with the module TTL; cache failures do not block API responses.
    private async writeCache<T>(key: string, value: T): Promise<void> {
        try {
            await redisJsonSet(key, value, CACHE_TTL_SECONDS);
        } catch {
            // Cache failures should not block the business API response.
        }
    }

    // Builds hourly booking slots from venue open hours, with safe defaults when missing.
    private createAvailabilitySlots(
        openHours: Record<string, string> | null | undefined,
        date: string
    ) {
        const dayKey = DAY_KEYS[this.readDateInVietnamTimezone(date).getDay()];
        const schedule = openHours?.[dayKey];

        if (!schedule) {
            return DEFAULT_TIME_SLOTS;
        }

        if (["closed", "off"].includes(schedule.trim().toLowerCase())) {
            return [];
        }

        const range = schedule.match(/^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/);

        if (!range) {
            return DEFAULT_TIME_SLOTS;
        }

        const start = Number(range[1]) * 60 + Number(range[2]);
        let end = Number(range[3]) * 60 + Number(range[4]);

        if (end <= start) {
            end += 24 * 60;
        }

        const slots: string[] = [];

        for (let minute = start; minute < end; minute += 60) {
            slots.push(this.formatTimeSlot(minute));
        }

        return slots;
    }

    // Normalizes booking time values to HH:mm so they match generated time slots.
    private normalizeBookingTime(value: string) {
        const match = value.match(/^(\d{1,2}):(\d{2})/);

        if (!match) {
            return value;
        }

        return `${match[1].padStart(2, "0")}:${match[2]}`;
    }

    // format số phút thành giờ HH:mm.
    private formatTimeSlot(totalMinutes: number) {
        const minutesInDay = 24 * 60;
        const normalizedMinutes = ((totalMinutes % minutesInDay) + minutesInDay) % minutesInDay;
        const hours = Math.floor(normalizedMinutes / 60).toString().padStart(2, "0");
        const minutes = (normalizedMinutes % 60).toString().padStart(2, "0");

        return `${hours}:${minutes}`;
    }

    // Parses a date as Vietnam local midnight for day-of-week availability logic.
    private readDateInVietnamTimezone(date: string) {
        return new Date(`${date}T00:00:00+07:00`);
    }
}

// tính khoảng cách giữa user và venue theo tọa độ.
// công thức phổ biến để tính khoảng cách giữa 2 điểm trên bề mặt Trái Đất.
function calculateDistanceInMeters(
    from: Pick<VenueNearbyQuery, "lat" | "lng">,
    to: Pick<VenueNearbyQuery, "lat" | "lng">
) {
    const latitudeDistance = toRadians(to.lat - from.lat);
    const longitudeDistance = toRadians(to.lng - from.lng);
    const startLatitude = toRadians(from.lat);
    const endLatitude = toRadians(to.lat);
    const haversine =
        Math.sin(latitudeDistance / 2) ** 2 +
        Math.cos(startLatitude) * Math.cos(endLatitude) *
        Math.sin(longitudeDistance / 2) ** 2;
    const angularDistance = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));

    return EARTH_RADIUS_METERS * angularDistance;
}

// Converts degrees to radians for geographic calculations.
function toRadians(value: number) {
    return value * Math.PI / 180;
}
