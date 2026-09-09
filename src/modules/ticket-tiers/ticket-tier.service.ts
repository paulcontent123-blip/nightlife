import { AuthException } from "@/modules/auth/auth.errors";
import { redisGetVersionAndJson, redisJsonSet } from "@/lib/redis/server";
import { EventRepository } from "@/modules/events/event.repository";
import {
    incrementTicketTierListCacheVersion,
    TICKET_TIER_LIST_CACHE_VERSION_KEY,
} from "./ticket-tier-cache";
import { TicketTierRepository } from "./ticket-tier.repository";
import {
    CreateTicketTierSchema,
    UpdateTicketTierSchema,
} from "./ticket-tier.validator";
import type {
    CreateTicketTierDTO,
    UpdateTicketTierDTO,
} from "./ticket-tier.types";

const TICKET_TIER_CACHE_TTL_SECONDS = 60;

type PublicTicketTiers = Awaited<ReturnType<TicketTierRepository["listByEvent"]>>;

interface CachedPublicTicketTiers {
    version: number;
    items: PublicTicketTiers;
}

export class TicketTierService {
    constructor(
        private repository = new TicketTierRepository(),
        private eventRepository = new EventRepository()
    ) { }

    async listPublicEventTicketTiers(eventSlug: string) {
        const cacheKey = `cache:ticket-tiers:list:${eventSlug}`;
        let version = 0;
        let redisAvailable = false;

        try {
            const cached = await redisGetVersionAndJson<CachedPublicTicketTiers>(
                TICKET_TIER_LIST_CACHE_VERSION_KEY,
                cacheKey
            );
            version = cached.version;
            redisAvailable = true;

            if (cached.value && cached.value.version === version) {
                return cached.value.items;
            }
        } catch {
            // Redis is optional; the database remains the source of truth.
        }

        const event = await this.eventRepository.findPublicBySlug(eventSlug);

        if (!event) {
            throw new AuthException(404, "EVENT_NOT_FOUND");
        }

        const items = await this.repository.listByEvent(event.id);

        if (redisAvailable) {
            try {
                await redisJsonSet(
                    cacheKey,
                    { version, items },
                    TICKET_TIER_CACHE_TTL_SECONDS
                );
            } catch {
                // Cache failures must not block the public ticket-tier list.
            }
        }

        return items;
    }

    async listAdminEventTicketTiers(eventId: string) {
        await this.ensureEventExists(eventId);

        return this.repository.listByEvent(eventId);
    }

    async createEventTicketTier(eventId: string, input: CreateTicketTierDTO) {
        await this.ensureEventExists(eventId);

        const dto = CreateTicketTierSchema.parse(input);

        const tier = await this.repository.create({
            event_id: eventId,
            name: dto.name,
            price: dto.price,
            quantity: dto.quantity,
            includes: dto.includes ?? [],
            sale_starts_at: dto.sale_starts_at ?? null,
            sale_ends_at: dto.sale_ends_at ?? null,
        });

        await incrementTicketTierListCacheVersion();

        return tier;
    }

    async updateTicketTier(id: string, input: UpdateTicketTierDTO) {
        const tier = await this.getExistingTicketTier(id);
        const dto = UpdateTicketTierSchema.parse(input);

        if (dto.quantity !== undefined && dto.quantity < tier.sold) {
            throw new AuthException(
                409,
                "TICKET_TIER_HAS_SALES",
                "Ticket tier quantity cannot be lower than sold tickets"
            );
        }

        const updatedTier = await this.repository.update(id, {
            ...(dto.name !== undefined ? { name: dto.name } : {}),
            ...(dto.price !== undefined ? { price: dto.price } : {}),
            ...(dto.quantity !== undefined ? { quantity: dto.quantity } : {}),
            ...(dto.includes !== undefined ? { includes: dto.includes } : {}),
            ...(dto.sale_starts_at !== undefined ? { sale_starts_at: dto.sale_starts_at } : {}),
            ...(dto.sale_ends_at !== undefined ? { sale_ends_at: dto.sale_ends_at } : {}),
        });

        await incrementTicketTierListCacheVersion();

        return updatedTier;
    }

    async deleteTicketTier(id: string) {
        const tier = await this.getExistingTicketTier(id);

        if (tier.sold > 0) {
            throw new AuthException(409, "TICKET_TIER_HAS_SALES");
        }

        const deletedTier = await this.repository.delete(id);

        await incrementTicketTierListCacheVersion();

        return deletedTier;
    }

    private async getExistingTicketTier(id: string) {
        const tier = await this.repository.findById(id);

        if (!tier) {
            throw new AuthException(404, "TICKET_TIER_NOT_FOUND");
        }

        return tier;
    }

    private async ensureEventExists(eventId: string) {
        const event = await this.eventRepository.findAnyById(eventId);

        if (!event) {
            throw new AuthException(404, "EVENT_NOT_FOUND");
        }
    }
}
