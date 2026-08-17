import { AuthService } from "@/modules/auth/auth.service";
import { failure, readJson, success } from "@/modules/auth/auth.response";
import type { LoginDTO } from "@/modules/auth/auth.types";

const authService = new AuthService();

export async function POST(request: Request) {
    try {
        const body = await readJson<LoginDTO>(request);
        const data = await authService.login(body);

        return success(data);
    } catch (error) {
        return failure(error);
    }
}
