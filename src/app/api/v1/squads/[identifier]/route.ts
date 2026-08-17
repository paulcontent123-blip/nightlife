import { failure, success } from "@/modules/auth/auth.response";
import { SquadService } from "@/modules/squads/squad.service";

interface RouteContext {
    params: Promise<{
        identifier: string;
    }>;
}

const squadService = new SquadService();

export async function GET(_request: Request, context: RouteContext) {
    try {
        const { identifier } = await context.params;
        const data = await squadService.getSquadByInviteCode(identifier);

        return success(data);
    } catch (error) {
        return failure(error);
    }
}
