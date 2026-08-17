import { AuthException } from "@/modules/auth/auth.errors";
import { incrementVenueAvailabilityCacheVersion } from "@/modules/venues/venue-cache";
import { VenueRepository } from "@/modules/venues/venue.repository";
import { VenueTableRepository } from "./venue-table.repository";
import {
    CreateVenueTableSchema,
    UpdateVenueTableSchema,
    VenueTableListQuerySchema,
} from "./venue-table.validator";
import type { CreateVenueTableDTO, UpdateVenueTableDTO } from "./venue-table.types";

export class VenueTableService {
    constructor(
        private repository = new VenueTableRepository(),
        private venueRepository = new VenueRepository()
    ) { }

    async listVenueTables(venueId: string, searchParams: URLSearchParams) {
        await this.ensureVenueExists(venueId);

        const query = VenueTableListQuerySchema.parse(Object.fromEntries(searchParams));

        return this.repository.listByVenue(venueId, query);
    }

    async getVenueTable(venueId: string, tableId: string) {
        await this.ensureVenueExists(venueId);

        const table = await this.repository.findById(venueId, tableId);

        if (!table) {
            throw new AuthException(404, "VENUE_TABLE_NOT_FOUND");
        }

        return table;
    }

    async createVenueTable(venueId: string, input: CreateVenueTableDTO) {
        await this.ensureVenueExists(venueId);

        const dto = CreateVenueTableSchema.parse(input);

        const table = await this.repository.create({
            venue_id: venueId,
            table_name: dto.table_name,
            type: dto.type,
            capacity: dto.capacity,
            min_spend: dto.min_spend ?? null,
            deposit_required: dto.deposit_required,
            is_active: dto.is_active,
        });

        await incrementVenueAvailabilityCacheVersion(venueId);

        return table;
    }

    async updateVenueTable(venueId: string, tableId: string, input: UpdateVenueTableDTO) {
        await this.getVenueTable(venueId, tableId);

        const dto = UpdateVenueTableSchema.parse(input);

        const table = await this.repository.update(venueId, tableId, dto);

        await incrementVenueAvailabilityCacheVersion(venueId);

        return table;
    }

    async deleteVenueTable(venueId: string, tableId: string) {
        await this.getVenueTable(venueId, tableId);

        const table = await this.repository.softDelete(venueId, tableId);

        await incrementVenueAvailabilityCacheVersion(venueId);

        return table;
    }

    private async ensureVenueExists(venueId: string) {
        const venue = await this.venueRepository.findById(venueId);

        if (!venue) {
            throw new AuthException(404, "VENUE_NOT_FOUND");
        }
    }
}
