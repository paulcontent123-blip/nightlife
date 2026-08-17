import { requireAuth } from "@/modules/auth/auth.guard";
import { failure, readJson, success } from "@/modules/auth/auth.response";
import { PassportService } from "@/modules/passport/passport.service";
import type { PassportRedeemDTO } from "@/modules/passport/passport.types";

const passportService = new PassportService();

export async function POST(request: Request) {
    try {
        const user = await requireAuth();
        const data = await passportService.redeem(
            await readJson<PassportRedeemDTO>(request),
            user
        );

        return success(data, 201);
    } catch (error) {
        return failure(error);
    }
}
