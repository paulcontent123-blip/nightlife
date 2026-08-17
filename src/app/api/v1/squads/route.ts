import { requireAuth } from "@/modules/auth/auth.guard";
import { failure, readJson, success } from "@/modules/auth/auth.response";
import { SquadService } from "@/modules/squads/squad.service";
import type { CreateSquadDTO } from "@/modules/squads/squad.types";

const squadService = new SquadService();

export async function POST(request: Request) {
    try {
        const user = await requireAuth();
        const data = await squadService.createSquad(
            await readJson<CreateSquadDTO>(request),
            user
        );

        return success(data, 201);
    } catch (error) {
        return failure(error);
    }
}
