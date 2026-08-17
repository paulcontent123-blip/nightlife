import { requireAdmin } from "@/modules/auth/auth.guard";
import { failure, readJson, success } from "@/modules/auth/auth.response";
import { VenueTableService } from "@/modules/venue-tables/venue-table.service";
import type { CreateVenueTableDTO } from "@/modules/venue-tables/venue-table.types";

interface RouteContext {
    params: Promise<{
        venueId: string;
    }>;
}

const venueTableService = new VenueTableService();

export async function GET(request: Request, context: RouteContext) {
    try {
        await requireAdmin();
        const { venueId } = await context.params;
        const url = new URL(request.url);
        const data = await venueTableService.listVenueTables(venueId, url.searchParams);

        return success(data);
    } catch (error) {
        return failure(error);
    }
}

export async function POST(request: Request, context: RouteContext) {
    try {
        await requireAdmin();
        const { venueId } = await context.params;
        const body = await readJson<CreateVenueTableDTO>(request);
        const data = await venueTableService.createVenueTable(venueId, body);

        return success(data, 201);
    } catch (error) {
        return failure(error);
    }
}
