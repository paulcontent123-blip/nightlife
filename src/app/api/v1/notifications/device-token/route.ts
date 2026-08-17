import { requireAuth } from "@/modules/auth/auth.guard";
import { failure, readJson, success } from "@/modules/auth/auth.response";
import { PushTokenService } from "@/modules/notifications/tokens/push-token.service";
import type {
    DeletePushTokenDTO,
    RegisterPushTokenDTO,
} from "@/modules/notifications/tokens/push-token.types";

const pushTokenService = new PushTokenService();

export async function POST(request: Request) {
    try {
        const user = await requireAuth();
        const data = await pushTokenService.register(
            await readJson<RegisterPushTokenDTO>(request),
            user
        );

        return success(data, 201);
    } catch (error) {
        return failure(error);
    }
}

export async function DELETE(request: Request) {
    try {
        const user = await requireAuth();
        const data = await pushTokenService.remove(
            await readJson<DeletePushTokenDTO>(request),
            user
        );

        return success(data);
    } catch (error) {
        return failure(error);
    }
}
