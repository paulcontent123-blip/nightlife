import { requireAuth } from "@/modules/auth/auth.guard";
import { failure, readJson, success } from "@/modules/auth/auth.response";
import { MembershipService } from "@/modules/membership/membership.service";
import type { SubscribeMembershipDTO } from "@/modules/membership/membership.types";

const membershipService = new MembershipService();

export async function POST(request: Request) {
    try {
        const user = await requireAuth();
        const data = await membershipService.subscribe(
            await readJson<SubscribeMembershipDTO>(request),
            user
        );

        return success(data, 201);
    } catch (error) {
        return failure(error);
    }
}
