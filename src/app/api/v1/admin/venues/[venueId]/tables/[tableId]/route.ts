import { requireAdmin } from "@/modules/auth/auth.guard";
import { failure, readJson, success } from "@/modules/auth/auth.response";
import { VenueTableService } from "@/modules/venue-tables/venue-table.service";
import type { UpdateVenueTableDTO } from "@/modules/venue-tables/venue-table.types";

interface RouteContext {
    params: Promise<{
        venueId: string;
        tableId: string;
    }>;
}

const venueTableService = new VenueTableService();

export async function GET(_request: Request, context: RouteContext) {
    try {
        await requireAdmin();
        const { venueId, tableId } = await context.params;
        const data = await venueTableService.getVenueTable(venueId, tableId);

        return success(data);
    } catch (error) {
        return failure(error);
    }
}

export async function PUT(request: Request, context: RouteContext) {
    try {
        await requireAdmin();
        const { venueId, tableId } = await context.params;
        const body = await readJson<UpdateVenueTableDTO>(request);
        const data = await venueTableService.updateVenueTable(venueId, tableId, body);

        return success(data);
    } catch (error) {
        return failure(error);
    }
}

export async function PATCH(request: Request, context: RouteContext) {
    try {
        await requireAdmin();
        const { venueId, tableId } = await context.params;
        const body = await readJson<UpdateVenueTableDTO>(request);
        const data = await venueTableService.updateVenueTable(venueId, tableId, body);

        return success(data);
    } catch (error) {
        return failure(error);
    }
}

export async function DELETE(_request: Request, context: RouteContext) {
    try {
        await requireAdmin();
        const { venueId, tableId } = await context.params;
        const data = await venueTableService.deleteVenueTable(venueId, tableId);

        return success(data);
    } catch (error) {
        return failure(error);
    }
}
