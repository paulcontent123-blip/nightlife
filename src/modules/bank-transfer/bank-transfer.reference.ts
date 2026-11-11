import { randomBytes } from "crypto";
import type { BankTransferPurpose } from "@/modules/payments/payment.types";

// Unambiguous uppercase alphabet (no 0/O, 1/I/L). Bank apps often strip
// punctuation or lowercase the transfer content, so references are plain
// uppercase alphanumerics, short enough for every bank's content field.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const RANDOM_LENGTH = 8;

const PURPOSE_PREFIX: Record<BankTransferPurpose, string> = {
    booking: "NLB",
    ticket_order: "NLT",
    membership: "NLM",
};

export function createBankTransferRef(purpose: BankTransferPurpose) {
    const bytes = randomBytes(RANDOM_LENGTH);
    let suffix = "";

    for (const byte of bytes) {
        suffix += ALPHABET[byte % ALPHABET.length];
    }

    return `${PURPOSE_PREFIX[purpose]}${suffix}`;
}

export function createBankTransferPaymentUrlPath(purpose: BankTransferPurpose, paymentRef: string) {
    const params = new URLSearchParams({ purpose, ref: paymentRef });

    return `/chuyen-khoan?${params.toString()}`;
}
