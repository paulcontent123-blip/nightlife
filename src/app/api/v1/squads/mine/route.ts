import { requireAuth } from "@/modules/auth/auth.guard";
import { failure, success } from "@/modules/auth/auth.response";
import { SquadService } from "@/modules/squads/squad.service";

const squadService = new SquadService();

export async function GET() {
    try {
        const user = await requireAuth();
        const data = await squadService.listMine(user);

        return success(data);
    } catch (error) {
        return failure(error);
    }
}
