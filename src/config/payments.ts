export type PaymentMode = "mock" | "sandbox" | "production";

export const paymentConfig = {
    mode: readPaymentMode(process.env.PAYMENT_MODE),
    vnpay: {
        tmnCode: process.env.VNPAY_TMN_CODE,
        hashSecret: process.env.VNPAY_HASH_SECRET,
    },
    momo: {
        partnerCode: process.env.MOMO_PARTNER_CODE,
        accessKey: process.env.MOMO_ACCESS_KEY,
        secretKey: process.env.MOMO_SECRET_KEY,
    },
} as const;

export function hasVnpayCredentials() {
    return Boolean(paymentConfig.vnpay.tmnCode && paymentConfig.vnpay.hashSecret);
}

export function hasMomoCredentials() {
    return Boolean(
        paymentConfig.momo.partnerCode &&
        paymentConfig.momo.accessKey &&
        paymentConfig.momo.secretKey
    );
}

function readPaymentMode(value: string | undefined): PaymentMode {
    if (value === "sandbox" || value === "production") {
        return value;
    }

    return "mock";
}
