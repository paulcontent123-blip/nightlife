"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { clientFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/envelope";
import { notifyAuthStateChanged } from "@/lib/auth/auth-events";
import type { AuthResponse } from "@/lib/api/types";
import { Button } from "@/components/ui/Button";
import { FieldGroup, Input } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";

export function RegisterForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const next = searchParams.get("next");
    const [displayName, setDisplayName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [needsConfirmation, setNeedsConfirmation] = useState(false);

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const data = await clientFetch<AuthResponse>("/api/v1/auth/register", {
                method: "POST",
                body: JSON.stringify({ email, password, display_name: displayName }),
            });

            if (!data.session) {
                setNeedsConfirmation(true);

                return;
            }

            notifyAuthStateChanged();
            router.push(next && next.startsWith("/") ? next : data.redirect_to);
            router.refresh();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Đăng ký thất bại, vui lòng thử lại.");
        } finally {
            setLoading(false);
        }
    }

    if (needsConfirmation) {
        return (
            <div className="rounded-2xl border border-border bg-void-2 p-7 text-center shadow-[0_12px_52px_rgba(0,0,0,.6)]">
                <p className="mb-2 text-3xl">📩</p>
                <p className="font-display text-lg font-extrabold">Kiểm tra email của bạn</p>
                <p className="mt-2 text-sm text-muted">
                    Chúng tôi đã gửi email xác nhận tới <span className="text-white">{email}</span>. Xác nhận xong
                    hãy quay lại đăng nhập.
                </p>
                <Link href="/login" className="mt-6 inline-block font-display text-sm font-bold text-amber">
                    Đến trang đăng nhập →
                </Link>
            </div>
        );
    }

    return (
        <div className="rounded-2xl border border-border bg-void-2 p-7 shadow-[0_12px_52px_rgba(0,0,0,.6)]">
            <p className="font-display text-xl font-extrabold">Tạo tài khoản</p>
            <p className="mb-6 text-sm text-muted">Tham gia cộng đồng nightlife Việt Nam</p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <FieldGroup label="Tên hiển thị">
                    <Input
                        required
                        minLength={3}
                        value={displayName}
                        onChange={(event) => setDisplayName(event.target.value)}
                        placeholder="Nguyễn Văn A"
                        autoComplete="nickname"
                    />
                </FieldGroup>
                <FieldGroup label="Email">
                    <Input
                        type="email"
                        required
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="you@email.com"
                        autoComplete="email"
                    />
                </FieldGroup>
                <FieldGroup label="Mật khẩu">
                    <Input
                        type="password"
                        required
                        minLength={8}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="Tối thiểu 8 ký tự"
                        autoComplete="new-password"
                    />
                </FieldGroup>
                {error && <Alert>{error}</Alert>}
                <Button type="submit" disabled={loading} className="w-full">
                    {loading ? "Đang tạo..." : "Đăng ký"}
                </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted">
                Đã có tài khoản?{" "}
                <Link href="/login" className="font-semibold text-amber">
                    Đăng nhập
                </Link>
            </p>
        </div>
    );
}
