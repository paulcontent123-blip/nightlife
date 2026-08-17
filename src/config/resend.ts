export const resendConfig = {
    apiKey: process.env.RESEND_API_KEY,
    fromEmail: process.env.RESEND_FROM_EMAIL ?? "Nightlife <onboarding@resend.dev>",
    replyTo: process.env.RESEND_REPLY_TO,
    operationsEmail: process.env.RESEND_ADMIN_EMAIL ?? process.env.RESEND_OPERATIONS_EMAIL,
} as const;

export function getResendApiKey() {
    if (!resendConfig.apiKey) {
        throw new Error("Missing RESEND_API_KEY environment variable");
    }

    return resendConfig.apiKey;
}

export function getResendFromEmail() {
    return resendConfig.fromEmail;
}

export function isResendConfigured() {
    return Boolean(resendConfig.apiKey);
}

export function getResendOperationsEmail() {
    return resendConfig.operationsEmail;
}
