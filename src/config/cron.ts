export function getCronSecret() {
    return process.env.CRON_SECRET?.trim() ?? "";
}

export function isCronConfigured() {
    return getCronSecret().length > 0;
}

export function isValidCronAuthorization(value: string | null) {
    const secret = getCronSecret();

    if (!secret || !value) {
        return false;
    }

    return value === `Bearer ${secret}` || value === secret;
}
