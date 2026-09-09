import { AuthException } from "@/modules/auth/auth.errors";
import type { UserProfile } from "@/modules/auth/auth.types";
import { incrementVenueListCacheVersion } from "@/modules/venues/venue-cache";
import { VenueRepository } from "@/modules/venues/venue.repository";
import { VenueReviewRepository } from "./venue-review.repository";
import {
    CreateVenueReviewSchema,
    VenueReviewListQuerySchema,
} from "./venue-review.validator";
import type { CreateVenueReviewDTO } from "./venue-review.types";

const MAX_REVIEW_IMAGES = 10;

export class VenueReviewService {
    constructor(
        private repository = new VenueReviewRepository(),
        private venueRepository = new VenueRepository()
    ) { }

    // Public review list for a venue slug, with pagination and optional rating sort.
    async listVenueReviews(slug: string, searchParams: URLSearchParams) {
        const venue = await this.getPublicVenue(slug);
        const query = VenueReviewListQuerySchema.parse(Object.fromEntries(searchParams));

        return this.repository.listByVenue(venue.id, query);
    }

    // Bookings the current user could attach a new review to for this venue.
    async listEligibleBookings(slug: string, user: UserProfile) {
        const venue = await this.getPublicVenue(slug);

        return this.repository.listEligibleBookingsForReview(venue.id, user.id);
    }

    // Authenticated users can review a venue only when they own a verified booking.
    async createVenueReview(slug: string, input: CreateVenueReviewDTO, user: UserProfile) {
        const venue = await this.getPublicVenue(slug);
        const dto = CreateVenueReviewSchema.parse(input);

        return this.createVerifiedVenueReview(venue.id, dto, user, []);
    }

    // Multipart review flow: upload image files to Cloudinary, then save their URLs on the review.
    async createVenueReviewWithImages(
        slug: string,
        input: CreateVenueReviewDTO,
        user: UserProfile,
        files: File[]
    ) {
        const { deleteReviewImageByUrl, uploadReviewImage } = await import("@/lib/cloudinary/review-images");
        const venue = await this.getPublicVenue(slug);
        const dto = CreateVenueReviewSchema.parse(input);

        if ((dto.images?.length ?? 0) + files.length > MAX_REVIEW_IMAGES) {
            throw new AuthException(422, "INVALID_REVIEW_IMAGE", `A review can have up to ${MAX_REVIEW_IMAGES} images`);
        }

        const uploadedImages = await Promise.all(files.map((file) => uploadReviewImage(venue.id, user.id, file)));
        const uploadedUrls = uploadedImages.map((image) => image.url);

        try {
            const review = await this.createVerifiedVenueReview(venue.id, {
                ...dto,
                images: [...(dto.images ?? []), ...uploadedUrls],
            }, user, uploadedUrls);

            return {
                review,
                uploaded: uploadedImages,
            };
        } catch (error) {
            await Promise.all(uploadedUrls.map((url) => deleteReviewImageByUrl(url)));

            throw error;
        }
    }

    private async createVerifiedVenueReview(
        venueId: string,
        dto: CreateVenueReviewDTO,
        user: UserProfile,
        uploadedImageUrls: string[]
    ) {
        const booking = await this.repository.findVerifiedBooking(dto.booking_id, venueId, user.id);

        if (!booking) {
            throw new AuthException(403, "BOOKING_NOT_VERIFIED");
        }

        if (await this.repository.reviewExistsForBooking(dto.booking_id)) {
            throw new AuthException(409, "REVIEW_EXISTS");
        }

        const review = await this.repository.create({
            venue_id: venueId,
            user_id: user.id,
            booking_id: dto.booking_id,
            rating: dto.rating,
            atmosphere_rating: dto.atmosphere_rating ?? null,
            service_rating: dto.service_rating ?? null,
            value_rating: dto.value_rating ?? null,
            content: dto.content ?? null,
            visited_date: dto.visited_date ?? booking.booking_date,
            images: dto.images ?? [],
            is_verified_visit: true,
        });

        await this.repository.refreshVenueRatingSummary(venueId);
        await incrementVenueListCacheVersion();
        const { PassportService } = await import("@/modules/passport/passport.service");

        await new PassportService().awardVenueReviewPoints({
            userId: user.id,
            reviewId: review.id,
        });

        return uploadedImageUrls.length > 0
            ? { ...review, uploaded_image_urls: uploadedImageUrls }
            : review;
    }

    private async getPublicVenue(slug: string) {
        const venue = await this.venueRepository.findBySlug(slug, true);

        if (!venue) {
            throw new AuthException(404, "VENUE_NOT_FOUND");
        }

        return venue;
    }
}
