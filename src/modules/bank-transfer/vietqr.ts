// Builds a VietQR image URL rendered by img.vietqr.io. The QR encodes the
// receiving account, the exact amount and the transfer content, so any
// Vietnamese banking app pre-fills the transfer when it is scanned.
// https://www.vietqr.io/danh-sach-api/link-tao-ma-nhanh/
export function createVietQrImageUrl(input: {
    bankBin: string;
    accountNumber: string;
    accountName: string;
    amount: number;
    transferContent: string;
}) {
    const path = `${encodeURIComponent(input.bankBin)}-${encodeURIComponent(input.accountNumber)}-compact2.png`;
    const params = new URLSearchParams({
        amount: String(input.amount),
        addInfo: input.transferContent,
        accountName: input.accountName,
    });

    // Encode spaces as %20 rather than "+", which not every decoder treats as a space.
    return `https://img.vietqr.io/image/${path}?${params.toString().replace(/\+/g, "%20")}`;
}

// VietQR / bank apps expect the account holder name in uppercase ASCII.
export function normalizeAccountName(value: string) {
    return value
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D")
        .replace(/[^A-Za-z0-9 ]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .toUpperCase();
}
