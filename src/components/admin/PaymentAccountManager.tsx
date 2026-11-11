"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { clientFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/envelope";
import type { PaymentAccount } from "@/lib/api/types";
import { VIETQR_BANKS } from "@/modules/bank-transfer/bank-transfer.constants";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FieldGroup, Input, Select } from "@/components/ui/Field";
import { Spinner } from "@/components/ui/Spinner";

export function PaymentAccountManager({ accounts }: { accounts: PaymentAccount[] }) {
    const router = useRouter();
    const [bankBin, setBankBin] = useState<string>(VIETQR_BANKS[0].bin);
    const [accountNumber, setAccountNumber] = useState("");
    const [accountName, setAccountName] = useState("");
    const [creating, setCreating] = useState(false);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function handleCreate(event: FormEvent) {
        event.preventDefault();
        setCreating(true);
        setError(null);

        try {
            await clientFetch("/api/v1/admin/payment-accounts", {
                method: "POST",
                body: JSON.stringify({
                    bank_bin: bankBin,
                    account_number: accountNumber.trim(),
                    account_name: accountName.trim(),
                }),
            });
            setAccountNumber("");
            setAccountName("");
            router.refresh();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Không thêm được tài khoản.");
        } finally {
            setCreating(false);
        }
    }

    async function runAction(account: PaymentAccount, action: "activate" | "deactivate" | "delete") {
        if (action === "delete" && !window.confirm(`Xoá tài khoản ${account.bank_code} ${account.account_number}?`)) {
            return;
        }

        setBusyId(account.id);
        setError(null);

        try {
            await clientFetch(`/api/v1/admin/payment-accounts/${account.id}`, action === "delete"
                ? { method: "DELETE" }
                : { method: "PATCH", body: JSON.stringify({ is_active: action === "activate" }) });
            router.refresh();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Thao tác thất bại.");
        } finally {
            setBusyId(null);
        }
    }

    return (
        <div className="flex flex-col gap-4">
            {!accounts.some((account) => account.is_active) && (
                <Alert tone="info">
                    Chưa có tài khoản nào đang dùng, nên khách chưa chọn được hình thức chuyển khoản QR.
                    Thêm tài khoản rồi bấm “Dùng tài khoản này”.
                </Alert>
            )}

            {error && <Alert>{error}</Alert>}

            {accounts.length > 0 && (
                <Card className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-void-3 text-left text-xs uppercase tracking-wide text-muted">
                            <tr>
                                <th className="whitespace-nowrap px-4 py-2.5 font-semibold">Ngân hàng</th>
                                <th className="whitespace-nowrap px-4 py-2.5 font-semibold">Số tài khoản</th>
                                <th className="whitespace-nowrap px-4 py-2.5 font-semibold">Chủ tài khoản</th>
                                <th className="whitespace-nowrap px-4 py-2.5 font-semibold">Trạng thái</th>
                                <th className="px-4 py-2.5" />
                            </tr>
                        </thead>
                        <tbody>
                            {accounts.map((account) => (
                                <tr key={account.id} className="border-t border-border">
                                    <td className="whitespace-nowrap px-4 py-2.5">{account.bank_name} ({account.bank_code})</td>
                                    <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs">{account.account_number}</td>
                                    <td className="whitespace-nowrap px-4 py-2.5">{account.account_name}</td>
                                    <td className="whitespace-nowrap px-4 py-2.5">
                                        <Badge tone={account.is_active ? "green" : "gray"}>
                                            {account.is_active ? "Đang dùng" : "Không dùng"}
                                        </Badge>
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-2.5 text-right">
                                        <div className="flex justify-end gap-2">
                                            {busyId === account.id ? (
                                                <Spinner />
                                            ) : (
                                                <>
                                                    {account.is_active ? (
                                                        <Button type="button" size="sm" variant="secondary" onClick={() => runAction(account, "deactivate")}>
                                                            Ngừng dùng
                                                        </Button>
                                                    ) : (
                                                        <Button type="button" size="sm" variant="ghost" onClick={() => runAction(account, "activate")}>
                                                            Dùng tài khoản này
                                                        </Button>
                                                    )}
                                                    <Button type="button" size="sm" variant="danger" onClick={() => runAction(account, "delete")}>
                                                        Xoá
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Card>
            )}

            <Card className="p-5">
                <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
                    <FieldGroup label="Ngân hàng" htmlFor="payment-account-bank">
                        <Select id="payment-account-bank" value={bankBin} onChange={(event) => setBankBin(event.target.value)}>
                            {VIETQR_BANKS.map((bank) => (
                                <option key={bank.bin} value={bank.bin}>
                                    {bank.name} ({bank.code})
                                </option>
                            ))}
                        </Select>
                    </FieldGroup>
                    <FieldGroup label="Số tài khoản" htmlFor="payment-account-number">
                        <Input
                            id="payment-account-number"
                            value={accountNumber}
                            onChange={(event) => setAccountNumber(event.target.value)}
                            inputMode="numeric"
                            pattern="[0-9A-Za-z]{6,19}"
                            required
                            placeholder="0123456789"
                        />
                    </FieldGroup>
                    <FieldGroup label="Chủ tài khoản" htmlFor="payment-account-name">
                        <Input
                            id="payment-account-name"
                            value={accountName}
                            onChange={(event) => setAccountName(event.target.value)}
                            required
                            minLength={3}
                            maxLength={80}
                            placeholder="NGUYEN VAN A"
                        />
                    </FieldGroup>
                    <Button type="submit" disabled={creating}>
                        {creating ? <Spinner /> : "Thêm tài khoản"}
                    </Button>
                </form>
                <p className="mt-3 text-xs text-muted">
                    Tên chủ tài khoản được chuyển thành chữ in hoa không dấu theo chuẩn VietQR. Tài khoản mới thêm ở
                    trạng thái “Không dùng”, bạn cần bấm “Dùng tài khoản này” để khách thấy.
                </p>
            </Card>
        </div>
    );
}
