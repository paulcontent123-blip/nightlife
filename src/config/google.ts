const GOOGLE_ANALYTICS_ID_PATTERN = /^G-[A-Z0-9]+$/i;

export function getGoogleAnalyticsId() {
    const measurementId = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID?.trim();

    return measurementId && GOOGLE_ANALYTICS_ID_PATTERN.test(measurementId)
        ? measurementId
        : undefined;
}

export function getGoogleSiteVerification() {
    const verificationToken = process.env.GOOGLE_SITE_VERIFICATION?.trim();

    return verificationToken || undefined;
}
