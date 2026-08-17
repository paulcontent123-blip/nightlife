import { requireAuth } from "@/modules/auth/auth.guard";
import { failure, success } from "@/modules/auth/auth.response";
import { SquadService } from "@/modules/squads/squad.service";

interface RouteContext {
    params: Promise<{
        identifier: string;
    }>;
}

const squadService = new SquadService();

export async function PUT(_request: Request, context: RouteContext) {
    try {
        const user = await requireAuth();
        const { identifier } = await context.params;
        const data = await squadService.confirmSquad(identifier, user);

        return success(data);
    } catch (error) {
        return failure(error);
    }
}
