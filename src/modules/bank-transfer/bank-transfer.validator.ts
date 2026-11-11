import { z } from "zod";
import { VIETQR_BANKS } from "./bank-transfer.constants";

const BANK_BINS = VIETQR_BANKS.map((bank) => bank.bin) as [string, ...string[]];

export const BankTransferPurposeSchema = z.enum(["booking", "ticket_order", "membership"]);

export const BankTransferLookupSchema = z.object({
    purpose: BankTransferPurposeSchema,
    ref: z.string().regex(/^NL[BTM][A-Z0-9]{8}$/),
});

export const BankTransferClaimSchema = z.object({
    purpose: BankTransferPurposeSchema,
    payment_ref: z.string().regex(/^NL[BTM][A-Z0-9]{8}$/),
});

export const CreateBookingBankTransferSchema = z.object({
    booking_id: z.string().uuid(),
});

export const AdminBankTransferActionSchema = z.object({
    purpose: BankTransferPurposeSchema,
    id: z.string().uuid(),
});

export const CreatePaymentAccountSchema = z.object({
    bank_bin: z.enum(BANK_BINS),
    account_number: z.string().trim().regex(/^[0-9A-Za-z]{6,19}$/, "Số tài khoản chỉ gồm 6–19 chữ số/chữ cái"),
    account_name: z.string().trim().min(3).max(80),
});

export const UpdatePaymentAccountSchema = z.object({
    is_active: z.boolean(),
});
