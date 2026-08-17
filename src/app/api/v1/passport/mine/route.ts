import { requireAuth } from "@/modules/auth/auth.guard";
import { failure, success } from "@/modules/auth/auth.response";
import { PassportService } from "@/modules/passport/passport.service";

const passportService = new PassportService();

export async function GET(request: Request) {
    try {
        const user = await requireAuth();
        const url = new URL(request.url);
        const data = await passportService.getMine(user, url.searchParams);

        return success(data);
    } catch (error) {
        return failure(error);
    }
}
