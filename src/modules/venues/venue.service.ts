import { geocodeAddress, getPlaceDetails } from "@/lib/google-maps/server";
import {
    deleteVenuePhotoByUrl,
    readVenuePhotoFingerprint,
    readVenuePhotoFingerprintFromUrl,
    uploadVenuePhoto,
} from "@/lib/cloudinary/venue-photos";
import { redisGetVersionAndJson, redisJsonSet } from "@/lib/redis/server";
import { AuthException } from "@/modules/auth/auth.errors";
import {
    CreateVenueSchema,
    UpdateVenueSchema,
    VenueListQuerySchema,
    VenueNearbyQuerySchema,
} from "./venue.validator";
import { VenueRepository } from "./venue.repository";
import { VenueListService } from "./venue-list.service";
import { VenueAvailabilityService } from "./venue-availability.service";
import { incrementBarTourCacheVersion } from "@/modules/bar-tour/bar-tour-cache";
import { mapVenue } from "./venue.mapper";
import {
    incrementVenueListCacheVersion,
    VENUE_LIST_CACHE_VERSION_KEY,
} from "./venue-cache";
import type {
    CreateVenueDTO,
    UpdateVenueDTO,
    VenueAddressPayload,
    VenueCity,
    VenueDealRow,
    VenueNearbyQuery,
    VenueNearbyResult,
    VenueReviewRow,
    VenueTableRow,
} from "./venue.types";

const DEFAULT_VENUE_ADDRESS: VenueAddressPayload = {
    address: "Ho Chi Minh City, Vietnam",
    district: "Q1",
    city: "hcm",
    lat: 10.7769,
    lng: 106.7009,
};

const CACHE_TTL_SECONDS = 300;
const MAX_VENUE_PHOTOS = 20;
const EARTH_RADIUS_METERS = 6_371_000;

function buildVenueDetailResult(
    venue: ReturnType<typeof mapVenue>,
    tables: VenueTableRow[],
    deals: VenueDealRow[],
    reviews: VenueReviewRow[]
) {
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

type PublicVenueDetailResult = ReturnType<typeof buildVenueDetailResult>;

export class VenueService {
    private readonly venueListService: VenueListService;
    private readonly venueAvailabilityService: VenueAvailabilityService;

    constructor(private repository = new VenueRepository()) {
        this.venueListService = new VenueListService(repository);
        this.venueAvailabilityService = new VenueAvailabilityService(repository);
    }

    //lấy danh sách venue cho người dùng public, có filter, sort, phân trang và cache Redis.
    async listPublicVenues(searchParams: URLSearchParams) {
        return this.venueListService.listPublicVenues(searchParams);
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
    // Cached (same invalidation counter as the venue list) since this is the
    // highest-traffic public detail page — cuts a 2-round-trip Supabase read
    // down to a single Redis round trip on a cache hit.
    async getPublicVenueDetailBySlug(slug: string, includeExclusiveDeals = false) {
        const cacheKey = this.createVenueDetailCacheKey(slug, includeExclusiveDeals);
        const { version, cached } = await this.readVenueDetailCache<PublicVenueDetailResult>(cacheKey);

        if (cached && cached.version === version) {
            return cached.data;
        }

        const venue = await this.getPublicVenueBySlug(slug);
        const [tables, deals, reviews] = await Promise.all([
            this.repository.listActiveTables(venue.id),
            this.repository.listActiveDeals(venue.id, includeExclusiveDeals),
            this.repository.listRecentReviews(venue.id),
        ]);

        const result = buildVenueDetailResult(venue, tables, deals, reviews);

        await this.writeVenueDetailCache(cacheKey, { version, data: result });

        return result;
    }

    // tạo cache key cho venue detail, tách riêng theo includeExclusiveDeals để
    // không lộ deal độc quyền cho user không phải VIP qua cache dùng chung.
    private createVenueDetailCacheKey(slug: string, includeExclusiveDeals: boolean) {
        return `cache:venues:detail:${slug}:${includeExclusiveDeals}`;
    }

    // Reads the venue-list invalidation counter and the detail cache entry in
    // one Redis round trip; reuses the same counter as the list cache since
    // every mutation that should invalidate detail pages already bumps it.
    private async readVenueDetailCache<T>(key: string): Promise<{ version: number; cached: { version: number; data: T } | null }> {
        try {
            const { version, value } = await redisGetVersionAndJson<{ version: number; data: T }>(
                VENUE_LIST_CACHE_VERSION_KEY,
                key
            );

            return { version, cached: value };
        } catch {
            return { version: 0, cached: null };
        }
    }

    private async writeVenueDetailCache<T>(key: string, value: { version: number; data: T }): Promise<void> {
        try {
            await redisJsonSet(key, value, CACHE_TTL_SECONDS);
        } catch {
            // Cache failures should not block the public venue detail page.
        }
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
    ) {
        return this.venueAvailabilityService.getVenueAvailability(slug, searchParams, perks);
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
        await incrementBarTourCacheVersion();

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
        await incrementBarTourCacheVersion();

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
        await incrementBarTourCacheVersion();

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
        await incrementBarTourCacheVersion();

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
        await incrementBarTourCacheVersion();

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
