import { requireAdmin } from "@/modules/auth/auth.guard";
import { failure, success } from "@/modules/auth/auth.response";
import { MembershipService } from "@/modules/membership/membership.service";

const membershipService = new MembershipService();

export async function GET(request: Request) {
    try {
        await requireAdmin();
        const url = new URL(request.url);
        const data = await membershipService.listAdminSubscriptions(url.searchParams);

        return success(data);
    } catch (error) {
        return failure(error);
    }
}
