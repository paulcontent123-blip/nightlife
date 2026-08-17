import { AuthException } from "@/modules/auth/auth.errors";
import { NotificationJobService } from "@/modules/notifications/jobs/notification-job.service";
import { VenueRepository } from "@/modules/venues/venue.repository";
import { DealRepository } from "./deal.repository";
import {
    CreateDealSchema,
    DealListQuerySchema,
    UpdateDealSchema,
} from "./deal.validator";
import type { CreateDealDTO, UpdateDealDTO } from "./deal.types";

export class DealService {
    constructor(
        private repository = new DealRepository(),
        private venueRepository = new VenueRepository(),
        private notificationJobService = new NotificationJobService()
    ) { }

    async listVenueDeals(venueId: string, searchParams: URLSearchParams) {
        await this.ensureVenueExists(venueId);

        const query = DealListQuerySchema.parse(Object.fromEntries(searchParams));

        return this.repository.listByVenue(venueId, query);
    }

    async listPublicDeals(searchParams: URLSearchParams, includeExclusiveDeals = false) {
        const query = DealListQuerySchema.parse(Object.fromEntries(searchParams));

        return this.repository.listPublic(query, includeExclusiveDeals);
    }

    async listPublicVenueDeals(slug: string, searchParams: URLSearchParams, includeExclusiveDeals = false) {
        const query = DealListQuerySchema.parse(Object.fromEntries(searchParams));

        return this.repository.listPublicByVenueSlug(slug, query, includeExclusiveDeals);
    }

    async listPublicVenueDealsById(venueId: string, searchParams: URLSearchParams, includeExclusiveDeals = false) {
        const query = DealListQuerySchema.parse(Object.fromEntries(searchParams));

        return this.repository.listPublicByVenueId(venueId, query, includeExclusiveDeals);
    }

    async getVenueDeal(venueId: string, dealId: string) {
        await this.ensureVenueExists(venueId);

        const deal = await this.repository.findById(venueId, dealId);

        if (!deal) {
            throw new AuthException(404, "DEAL_NOT_FOUND");
        }

        return deal;
    }

    async createVenueDeal(venueId: string, input: CreateDealDTO) {
        const venue = await this.ensureVenueExists(venueId);

        const dto = CreateDealSchema.parse(input);

        const deal = await this.repository.create({
            venue_id: venueId,
            title: dto.title,
            description: dto.description ?? null,
            discount_type: dto.discount_type ?? null,
            discount_value: dto.discount_value ?? null,
            applicable_days: dto.applicable_days ?? [],
            start_time: dto.start_time,
            end_time: dto.end_time,
            conditions: dto.conditions ?? null,
            is_exclusive: dto.is_exclusive,
            is_active: dto.is_active,
            valid_until: dto.valid_until ?? null,
        });

        await this.scheduleHappyHourStartingJob(deal, venue);

        return deal;
    }

    async updateVenueDeal(venueId: string, dealId: string, input: UpdateDealDTO) {
        await this.getVenueDeal(venueId, dealId);

        const dto = UpdateDealSchema.parse(input);

        const deal = await this.repository.update(venueId, dealId, dto);
        const venue = await this.ensureVenueExists(venueId);

        await this.scheduleHappyHourStartingJob(deal, venue);

        return deal;
    }

    async deleteVenueDeal(venueId: string, dealId: string) {
        await this.getVenueDeal(venueId, dealId);

        return this.repository.softDelete(venueId, dealId);
    }

    private async ensureVenueExists(venueId: string) {
        const venue = await this.venueRepository.findById(venueId);

        if (!venue) {
            throw new AuthException(404, "VENUE_NOT_FOUND");
        }

        return venue;
    }

    private async scheduleHappyHourStartingJob(
        deal: {
            id: string;
            title: string;
            start_time: string;
            applicable_days: string[];
            valid_until: string | null;
            is_active: boolean;
        },
        venue: {
            id: string;
            slug: string;
            name: string;
            city: string | null;
            district: string | null;
        }
    ) {
        try {
            return await this.notificationJobService.scheduleHappyHourStarting({ deal, venue });
        } catch {
            return null;
        }
    }
}
