import { requireAuth } from "@/modules/auth/auth.guard";
import { failure, success } from "@/modules/auth/auth.response";
import { PassportService } from "@/modules/passport/passport.service";

const passportService = new PassportService();

export async function GET() {
    try {
        const user = await requireAuth();
        const data = passportService.listRewards(user);

        return success(data);
    } catch (error) {
        return failure(error);
    }
}
