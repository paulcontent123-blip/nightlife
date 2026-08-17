import { requireAuth } from "@/modules/auth/auth.guard";
import { failure, readJson, success } from "@/modules/auth/auth.response";
import { SquadService } from "@/modules/squads/squad.service";
import type { SplitBillDTO } from "@/modules/squads/squad.types";

interface RouteContext {
    params: Promise<{
        identifier: string;
    }>;
}

const squadService = new SquadService();

export async function POST(request: Request, context: RouteContext) {
    try {
        const user = await requireAuth();
        const { identifier } = await context.params;
        const data = await squadService.splitBill(
            identifier,
            await readJson<SplitBillDTO>(request),
            user
        );

        return success(data);
    } catch (error) {
        return failure(error);
    }
}
