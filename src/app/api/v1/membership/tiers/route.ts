import { failure, success } from "@/modules/auth/auth.response";
import { MembershipService } from "@/modules/membership/membership.service";

const membershipService = new MembershipService();

export async function GET() {
    try {
        const data = membershipService.listTiers();

        return success(data);
    } catch (error) {
        return failure(error);
    }
}
