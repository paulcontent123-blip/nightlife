import { AuthService } from "@/modules/auth/auth.service";
import { failure, readJson, success } from "@/modules/auth/auth.response";

interface RefreshBody {
    refresh_token?: string;
}

const authService = new AuthService();

export async function POST(request: Request) {
    try {
        const body = await readJson<RefreshBody>(request);
        const data = await authService.refresh(body.refresh_token);

        return success(data);
    } catch (error) {
        return failure(error);
    }
}
