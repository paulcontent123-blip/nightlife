import { FcmPushProvider } from "./providers/push.provider";
import { PushTokenRepository } from "./tokens/push-token.repository";
import type { PushNotificationPayload } from "./tokens/push-token.types";

export class PushNotificationService {
    constructor(
        private pushTokenRepository = new PushTokenRepository(),
        private pushProvider = new FcmPushProvider()
    ) { }

    async sendToUser(userId: string, payload: PushNotificationPayload) {
        const tokenRows = await this.pushTokenRepository.listActiveTokensForUser(userId);
        const tokens = tokenRows.map((row) => row.token);
        const result = await this.pushProvider.sendToTokens(tokens, payload);

        await this.pushTokenRepository.deactivateTokens(result.invalid_tokens);
        const { invalid_tokens: invalidTokens, ...publicResult } = result;

        return {
            ...publicResult,
            deactivated_token_count: invalidTokens.length,
        };
    }
}
