import { requireAdmin } from "@/modules/auth/auth.guard";
import { failure, success } from "@/modules/auth/auth.response";
import { MembershipService } from "@/modules/membership/membership.service";

interface RouteContext {
    params: Promise<{
        id: string;
    }>;
}

const membershipService = new MembershipService();

export async function POST(_request: Request, context: RouteContext) {
    try {
        await requireAdmin();
        const { id } = await context.params;
        const data = await membershipService.confirmSubscription(id);

        return success(data);
    } catch (error) {
        return failure(error);
    }
}
