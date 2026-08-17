import { AuthException } from "@/modules/auth/auth.errors";
import { EventRepository } from "@/modules/events/event.repository";
import { TicketTierRepository } from "./ticket-tier.repository";
import {
    CreateTicketTierSchema,
    UpdateTicketTierSchema,
} from "./ticket-tier.validator";
import type {
    CreateTicketTierDTO,
    UpdateTicketTierDTO,
} from "./ticket-tier.types";

export class TicketTierService {
    constructor(
        private repository = new TicketTierRepository(),
        private eventRepository = new EventRepository()
    ) { }

    async listPublicEventTicketTiers(eventSlug: string) {
        const event = await this.eventRepository.findPublicBySlug(eventSlug);

        if (!event) {
            throw new AuthException(404, "EVENT_NOT_FOUND");
        }

        return this.repository.listByEvent(event.id);
    }

    async listAdminEventTicketTiers(eventId: string) {
        await this.ensureEventExists(eventId);

        return this.repository.listByEvent(eventId);
    }

    async createEventTicketTier(eventId: string, input: CreateTicketTierDTO) {
        await this.ensureEventExists(eventId);

        const dto = CreateTicketTierSchema.parse(input);

        return this.repository.create({
            event_id: eventId,
            name: dto.name,
            price: dto.price,
            quantity: dto.quantity,
            includes: dto.includes ?? [],
            sale_starts_at: dto.sale_starts_at ?? null,
            sale_ends_at: dto.sale_ends_at ?? null,
        });
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

        return this.repository.update(id, {
            ...(dto.name !== undefined ? { name: dto.name } : {}),
            ...(dto.price !== undefined ? { price: dto.price } : {}),
            ...(dto.quantity !== undefined ? { quantity: dto.quantity } : {}),
            ...(dto.includes !== undefined ? { includes: dto.includes } : {}),
            ...(dto.sale_starts_at !== undefined ? { sale_starts_at: dto.sale_starts_at } : {}),
            ...(dto.sale_ends_at !== undefined ? { sale_ends_at: dto.sale_ends_at } : {}),
        });
    }

    async deleteTicketTier(id: string) {
        const tier = await this.getExistingTicketTier(id);

        if (tier.sold > 0) {
            throw new AuthException(409, "TICKET_TIER_HAS_SALES");
        }

        return this.repository.delete(id);
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
