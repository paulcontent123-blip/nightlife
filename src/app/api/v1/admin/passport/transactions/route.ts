import { requireAdmin } from "@/modules/auth/auth.guard";
import { failure, success } from "@/modules/auth/auth.response";
import { PassportService } from "@/modules/passport/passport.service";

const passportService = new PassportService();

export async function GET(request: Request) {
    try {
        await requireAdmin();
        const url = new URL(request.url);
        const data = await passportService.listAdminTransactions(url.searchParams);

        return success(data);
    } catch (error) {
        return failure(error);
    }
}
