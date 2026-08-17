import { requireAuth } from "@/modules/auth/auth.guard";
import { failure, success } from "@/modules/auth/auth.response";
import { MembershipService } from "@/modules/membership/membership.service";

const membershipService = new MembershipService();

export async function GET() {
    try {
        const user = await requireAuth();
        const data = await membershipService.getMine(user.id);

        return success(data);
    } catch (error) {
        return failure(error);
    }
}
