import { AuthService } from "@/modules/auth/auth.service";
import { failure, success } from "@/modules/auth/auth.response";

const authService = new AuthService();

export async function POST() {
    try {
        const data = await authService.logout();

        return success(data);
    } catch (error) {
        return failure(error);
    }
}
