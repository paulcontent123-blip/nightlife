import { failure, success } from "@/modules/auth/auth.response";
import { requireAdmin } from "@/modules/auth/auth.guard";

export async function GET() {
    try {
        const data = await requireAdmin();

        return success(data);
    } catch (error) {
        return failure(error);
    }
}
