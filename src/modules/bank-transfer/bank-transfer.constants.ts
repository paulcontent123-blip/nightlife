// Banks supported by the receiving-account form. `bin` is the NAPAS bank BIN
// used by VietQR; `code` is the short code shown to users.
// Source: VietQR bank list (https://api.vietqr.io/v2/banks). Verify a new
// entry against that list before adding it.
export const VIETQR_BANKS = [
    { bin: "970436", code: "VCB", name: "Vietcombank" },
    { bin: "970415", code: "ICB", name: "VietinBank" },
    { bin: "970418", code: "BIDV", name: "BIDV" },
    { bin: "970405", code: "VBA", name: "Agribank" },
    { bin: "970407", code: "TCB", name: "Techcombank" },
    { bin: "970422", code: "MB", name: "MB Bank" },
    { bin: "970416", code: "ACB", name: "ACB" },
    { bin: "970432", code: "VPB", name: "VPBank" },
    { bin: "970423", code: "TPB", name: "TPBank" },
    { bin: "970403", code: "STB", name: "Sacombank" },
    { bin: "970437", code: "HDB", name: "HDBank" },
    { bin: "970441", code: "VIB", name: "VIB" },
    { bin: "970443", code: "SHB", name: "SHB" },
    { bin: "970431", code: "EIB", name: "Eximbank" },
    { bin: "970426", code: "MSB", name: "MSB" },
    { bin: "970448", code: "OCB", name: "OCB" },
    { bin: "970440", code: "SEAB", name: "SeABank" },
    { bin: "970449", code: "LPB", name: "LPBank" },
    { bin: "970428", code: "NAB", name: "Nam A Bank" },
    { bin: "970409", code: "BAB", name: "Bac A Bank" },
    { bin: "970454", code: "VCCB", name: "BVBank" },
] as const;

export type VietQrBank = (typeof VIETQR_BANKS)[number];

export function findVietQrBank(bin: string) {
    return VIETQR_BANKS.find((bank) => bank.bin === bin) ?? null;
}

// Ticket seats are held while the user opens their banking app and transfers.
export const BANK_TRANSFER_TICKET_HOLD_MINUTES = 15;

export const BANK_TRANSFER_PURPOSE_LABEL = {
    booking: "Đặt cọc bàn",
    ticket_order: "Vé sự kiện",
    membership: "Membership",
} as const;
