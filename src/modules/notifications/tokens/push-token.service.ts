import type { UserProfile } from "@/modules/auth/auth.types";
import { DeletePushTokenSchema, RegisterPushTokenSchema } from "./push-token.validator";
import { PushTokenRepository } from "./push-token.repository";
import type { DeletePushTokenDTO, RegisterPushTokenDTO } from "./push-token.types";

export class PushTokenService {
    constructor(private repository = new PushTokenRepository()) { }

    async register(input: RegisterPushTokenDTO, user: UserProfile) {
        const dto = RegisterPushTokenSchema.parse(input);
        const token = await this.repository.upsertToken({
            userId: user.id,
            token: dto.token,
            platform: dto.platform,
            userAgent: dto.user_agent ?? null,
        });

        return {
            token_id: token.id,
            platform: token.platform,
            is_active: token.is_active,
            last_seen_at: token.last_seen_at,
        };
    }

    async remove(input: DeletePushTokenDTO, user: UserProfile) {
        const dto = DeletePushTokenSchema.parse(input);

        return this.repository.deleteToken(user.id, dto.token);
    }
}
