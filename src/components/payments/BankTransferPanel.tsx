"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { clientFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/envelope";
import type { BankTransferInstructions } from "@/lib/api/types";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { LinkButton } from "@/components/ui/LinkButton";
import { Spinner } from "@/components/ui/Spinner";
import { formatVnd } from "@/lib/format";

export function BankTransferPanel({ initial }: { initial: BankTransferInstructions }) {
    const [payment, setPayment] = useState(initial);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [qrFailed, setQrFailed] = useState(false);
    const remainingSeconds = useCountdown(payment.status === "awaiting_transfer" ? payment.expires_at : null);
    const holdExpired = remainingSeconds !== null && remainingSeconds <= 0;

    async function handleClaim() {
        setSubmitting(true);
        setError(null);

        try {
            const result = await clientFetch<BankTransferInstructions>("/api/v1/payments/bank-transfer/claim", {
                method: "POST",
                body: JSON.stringify({ purpose: payment.purpose, payment_ref: payment.payment_ref }),
            });

            setPayment(result);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Không gửi được xác nhận, vui lòng thử lại.");
        } finally {
            setSubmitting(false);
        }
    }

    const showDetails = (payment.status === "awaiting_transfer" && !holdExpired) || payment.status === "claimed";

    return (
        <div className="rounded-2xl border border-border bg-void-2 p-6 shadow-[0_12px_52px_rgba(0,0,0,.6)] sm:p-7">
            <p className="mb-1 font-display text-[11px] font-bold uppercase tracking-widest text-amber">
                Chuyển khoản ngân hàng
            </p>
            <p className="mb-1 text-sm text-muted">{payment.title}</p>
            <p className="mb-5 font-display text-3xl font-extrabold">{formatVnd(payment.amount)}</p>

            <StatusMessage payment={payment} holdExpired={holdExpired} />

            {showDetails && !payment.account && (
                <div className="mb-5">
                    <Alert>Hệ thống chưa cấu hình tài khoản nhận tiền. Vui lòng liên hệ hỗ trợ trước khi chuyển khoản.</Alert>
                </div>
            )}

            {showDetails && payment.account && (
                <>
                    {payment.qr_image_url && !qrFailed && (
                        <div className="mx-auto mb-5 w-full max-w-[280px] overflow-hidden rounded-xl bg-white p-2">
                            {/* eslint-disable-next-line @next/next/no-img-element -- external VietQR image, rendered as-is */}
                            <img
                                src={payment.qr_image_url}
                                alt={`Mã VietQR chuyển ${formatVnd(payment.amount)} tới ${payment.account.bank_name}`}
                                className="h-auto w-full"
                                onError={() => setQrFailed(true)}
                            />
                        </div>
                    )}
                    {qrFailed && (
                        <div className="mb-5">
                            <Alert tone="info">Không tải được mã QR. Bạn vẫn có thể chuyển khoản thủ công theo thông tin bên dưới.</Alert>
                        </div>
                    )}

                    <div className="mb-5 flex flex-col divide-y divide-border rounded-lg border border-border-strong bg-void-3 text-sm">
                        <CopyRow label="Ngân hàng" value={`${payment.account.bank_name} (${payment.account.bank_code})`} />
                        <CopyRow label="Số tài khoản" value={payment.account.account_number} copyValue={payment.account.account_number} mono />
                        <CopyRow label="Chủ tài khoản" value={payment.account.account_name} />
                        <CopyRow label="Số tiền" value={formatVnd(payment.amount)} copyValue={String(payment.amount)} />
                        <CopyRow label="Nội dung chuyển khoản" value={payment.payment_ref} copyValue={payment.payment_ref} mono highlight />
                    </div>

                    <p className="mb-5 text-xs leading-relaxed text-muted">
                        Quét mã bằng app ngân hàng, hoặc chuyển khoản thủ công.{" "}
                        <strong className="text-white">Ghi đúng nội dung {payment.payment_ref} và đúng số tiền</strong>{" "}
                        để admin đối soát được giao dịch của bạn.
                    </p>
                </>
            )}

            {error && <div className="mb-4"><Alert>{error}</Alert></div>}

            {payment.status === "awaiting_transfer" && !holdExpired && (
                <Button
                    type="button"
                    onClick={handleClaim}
                    disabled={submitting || !payment.account}
                    className="mb-3 w-full"
                >
                    {submitting ? <Spinner /> : "Tôi đã chuyển khoản"}
                </Button>
            )}

            <LinkButton href={payment.return_url} variant="secondary" className="w-full" prefetch={false}>
                {payment.status === "awaiting_transfer" ? "Để sau" : "Tiếp tục"}
            </LinkButton>

            {remainingSeconds !== null && remainingSeconds > 0 && (
                <p className="mt-3 text-center text-xs text-muted">
                    Vé được giữ thêm <span className="font-mono text-amber">{formatCountdown(remainingSeconds)}</span>.
                    Hãy chuyển khoản và bấm “Tôi đã chuyển khoản” trước khi hết giờ.
                </p>
            )}
        </div>
    );
}

function StatusMessage({ payment, holdExpired }: { payment: BankTransferInstructions; holdExpired: boolean }) {
    if (payment.status === "paid") {
        return (
            <div className="mb-5">
                <Alert tone="success">Admin đã xác nhận nhận được tiền. Cảm ơn bạn!</Alert>
            </div>
        );
    }

    if (payment.status === "claimed") {
        return (
            <div className="mb-5">
                <Alert tone="info">
                    Đã ghi nhận bạn báo chuyển khoản{payment.claimed_at ? ` lúc ${new Date(payment.claimed_at).toLocaleString("vi-VN")}` : ""}.
                    Admin sẽ đối soát sao kê và xác nhận. Bạn sẽ nhận thông báo khi hoàn tất.
                </Alert>
            </div>
        );
    }

    if (payment.status === "expired" || holdExpired) {
        return (
            <div className="mb-5">
                <Alert>
                    Thời gian giữ vé đã hết. <strong>Đừng chuyển khoản cho giao dịch này</strong>; vui lòng đặt mua lại.
                    Nếu bạn đã lỡ chuyển khoản, hãy liên hệ hỗ trợ kèm nội dung {payment.payment_ref}.
                </Alert>
            </div>
        );
    }

    if (payment.status === "cancelled") {
        return (
            <div className="mb-5">
                <Alert>Giao dịch này đã bị huỷ hoặc không còn chờ thanh toán.</Alert>
            </div>
        );
    }

    return null;
}

function CopyRow({
    label,
    value,
    copyValue,
    mono,
    highlight,
}: {
    label: string;
    value: string;
    copyValue?: string;
    mono?: boolean;
    highlight?: boolean;
}) {
    const [copied, setCopied] = useState(false);

    async function handleCopy() {
        if (!copyValue) {
            return;
        }

        try {
            await navigator.clipboard.writeText(copyValue);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            // Clipboard can be blocked; the value is still visible to copy by hand.
        }
    }

    return (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5">
            <span className="shrink-0 text-muted">{label}</span>
            <span className="flex min-w-0 items-center gap-2">
                <span
                    className={[
                        "truncate",
                        mono ? "font-mono text-[13px]" : "font-semibold",
                        highlight ? "text-amber" : "text-white",
                    ].join(" ")}
                >
                    {value}
                </span>
                {copyValue && (
                    <button
                        type="button"
                        onClick={handleCopy}
                        className="shrink-0 rounded-md border border-border-strong px-2 py-0.5 text-[11px] font-semibold text-muted transition-colors hover:border-amber-border hover:text-amber"
                        aria-label={`Sao chép ${label.toLowerCase()}`}
                    >
                        {copied ? "Đã chép" : "Chép"}
                    </button>
                )}
            </span>
        </div>
    );
}

function useCountdown(expiresAt: string | null) {
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        if (!expiresAt) {
            return;
        }

        const timer = setInterval(() => setNow(Date.now()), 1000);

        return () => clearInterval(timer);
    }, [expiresAt]);

    if (!expiresAt) {
        return null;
    }

    return Math.max(0, Math.floor((Date.parse(expiresAt) - now) / 1000));
}

function formatCountdown(totalSeconds: number) {
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
    const seconds = (totalSeconds % 60).toString().padStart(2, "0");

    return `${minutes}:${seconds}`;
}

export function BankTransferUnavailable({ backHref }: { backHref: string }) {
    return (
        <div className="flex flex-col gap-4">
            <Alert>Không tìm thấy giao dịch chuyển khoản này.</Alert>
            <Link href={backHref} prefetch={false} className="text-sm font-semibold text-amber hover:underline">
                ← Quay lại
            </Link>
        </div>
    );
}
