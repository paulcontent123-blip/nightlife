import { AuthService } from "@/modules/auth/auth.service";
import { failure, readJson, success } from "@/modules/auth/auth.response";
import type { RegisterDTO } from "@/modules/auth/auth.types";

const authService = new AuthService();

export async function POST(request: Request) {
    try {
        const body = await readJson<RegisterDTO>(request);
        const data = await authService.register(body);

        return success(data, 201);
    } catch (error) {
        return failure(error);
    }
}
