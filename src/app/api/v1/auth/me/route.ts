import { AuthService } from "@/modules/auth/auth.service";
import { failure, success } from "@/modules/auth/auth.response";

const authService = new AuthService();

export async function GET() {
    try {
        const data = await authService.me();

        return success(data);
    } catch (error) {
        return failure(error);
    }
}
