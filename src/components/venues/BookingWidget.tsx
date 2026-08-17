"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { clientFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/envelope";
import { supabase } from "@/lib/supabase/client";
import type { Booking, CreatePaymentResult, VenueAvailabilityResult } from "@/lib/api/types";
import { Button } from "@/components/ui/Button";
import { FieldGroup, Input, Select, Textarea } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";
import { formatVnd } from "@/lib/format";

const PAYMENT_METHODS: Array<{ value: "cash" | "vnpay" | "momo"; label: string }> = [
    { value: "cash", label: "Tiền mặt tại quầy" },
    { value: "vnpay", label: "VNPay" },
    { value: "momo", label: "MoMo" },
];

function todayIso() {
    return new Date().toISOString().slice(0, 10);
}

export function BookingWidget({ slug, venueId }: { slug: string; venueId: string }) {
    const router = useRouter();
    const [date, setDate] = useState(todayIso());
    const [partySize, setPartySize] = useState(2);
    const [availability, setAvailability] = useState<VenueAvailabilityResult | null>(null);
    const [checking, setChecking] = useState(false);
    const [checkError, setCheckError] = useState<string | null>(null);

    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
    const [specialRequests, setSpecialRequests] = useState("");
    const [paymentMethod, setPaymentMethod] = useState<"cash" | "vnpay" | "momo">("cash");
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [requiresLogin, setRequiresLogin] = useState(false);
    const hasAvailabilityRef = useRef(false);

    const availableTablesForTime = useMemo(() => {
        if (!availability || !selectedTime) {
            return [];
        }

        const slot = availability.time_slots.find((item) => item.time === selectedTime);

        if (!slot) {
            return [];
        }

        const idSet = new Set(slot.available_table_ids);

        return availability.tables.filter((table) => idSet.has(table.id));
    }, [availability, selectedTime]);

    const selectedTable = availableTablesForTime.find((table) => table.id === selectedTableId) ?? null;

    const loadAvailability = useCallback(async ({ resetSelection = false, silent = false } = {}) => {
        if (!silent) {
            setChecking(true);
        }

        setCheckError(null);

        if (resetSelection) {
            setAvailability(null);
            setSelectedTime(null);
            setSelectedTableId(null);
        }

        try {
            const result = await clientFetch<VenueAvailabilityResult>(
                `/api/v1/venues/${slug}/availability?date=${date}&party_size=${partySize}`
            );

            setAvailability(result);
        } catch (error) {
            setCheckError(error instanceof ApiError ? error.message : "Could not check availability.");
        } finally {
            if (!silent) {
                setChecking(false);
            }
        }
    }, [date, partySize, slug]);

    async function handleCheckAvailability(event: FormEvent) {
        event.preventDefault();
        setChecking(true);
        setCheckError(null);
        setAvailability(null);
        setSelectedTime(null);
        setSelectedTableId(null);

        try {
            const result = await clientFetch<VenueAvailabilityResult>(
                `/api/v1/venues/${slug}/availability?date=${date}&party_size=${partySize}`
            );

            setAvailability(result);
        } catch (error) {
            setCheckError(error instanceof ApiError ? error.message : "Không kiểm tra được chỗ trống.");
        } finally {
            setChecking(false);
        }
    }

    useEffect(() => {
        hasAvailabilityRef.current = availability !== null;
    }, [availability]);

    useEffect(() => {
        const channel = supabase
            .channel(`venue-availability-${venueId}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "bookings",
                    filter: `venue_id=eq.${venueId}`,
                },
                () => {
                    if (hasAvailabilityRef.current) {
                        void loadAvailability({ silent: true });
                    }
                }
            )
            .subscribe();

        return () => {
            void supabase.removeChannel(channel);
        };
    }, [loadAvailability, venueId]);

    useEffect(() => {
        if (!availability || !selectedTime || !selectedTableId) {
            return;
        }

        const slot = availability.time_slots.find((item) => item.time === selectedTime);

        if (!slot || !slot.available_table_ids.includes(selectedTableId)) {
            setSelectedTableId(null);
        }
    }, [availability, selectedTableId, selectedTime]);

    async function handleSubmitBooking(event: FormEvent) {
        event.preventDefault();

        if (!selectedTime || !selectedTableId || !availability) {
            return;
        }

        setSubmitting(true);
        setSubmitError(null);
        setRequiresLogin(false);

        try {
            const booking = await clientFetch<Booking>("/api/v1/bookings", {
                method: "POST",
                body: JSON.stringify({
                    venue_id: venueId,
                    table_id: selectedTableId,
                    booking_date: date,
                    booking_time: selectedTime,
                    party_size: partySize,
                    special_requests: specialRequests || null,
                    payment_method: paymentMethod,
                }),
            });

            if (booking.deposit.amount > 0 && (paymentMethod === "vnpay" || paymentMethod === "momo")) {
                const payment = await clientFetch<CreatePaymentResult>(`/api/v1/payments/${paymentMethod}/create`, {
                    method: "POST",
                    body: JSON.stringify({ booking_id: booking.id }),
                });

                window.location.href = payment.payment_url;

                return;
            }

            router.push(`/bookings/${booking.id}`);
        } catch (error) {
            if (error instanceof ApiError && error.status === 401) {
                setRequiresLogin(true);
            } else {
                setSubmitError(error instanceof ApiError ? error.message : "Đặt bàn thất bại, vui lòng thử lại.");
            }
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="sticky top-24 rounded-[18px] border border-border bg-void-2 p-6 shadow-[0_12px_52px_rgba(0,0,0,.6)]">
            <div className="mb-4 h-[2px] w-full bg-gradient-to-r from-amber via-pink to-cyan" />
            <p className="font-display text-lg font-extrabold">Đặt bàn</p>
            <p className="mb-5 text-[13px] text-muted">Chọn ngày giờ để xem bàn còn trống</p>

            <form onSubmit={handleCheckAvailability} className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3">
                    <FieldGroup label="Ngày đi">
                        <Input type="date" required min={todayIso()} value={date} onChange={(event) => setDate(event.target.value)} />
                    </FieldGroup>
                    <FieldGroup label="Số người">
                        <Input
                            type="number"
                            required
                            min={1}
                            max={100}
                            value={partySize}
                            onChange={(event) => setPartySize(Number(event.target.value))}
                        />
                    </FieldGroup>
                </div>
                {checkError && <Alert>{checkError}</Alert>}
                <Button type="submit" variant="secondary" disabled={checking} className="w-full">
                    {checking ? <Spinner /> : "Kiểm tra chỗ trống"}
                </Button>
            </form>

            {availability && (
                <div className="mt-5 flex flex-col gap-4 border-t border-border pt-5">
                    {availability.time_slots.every((slot) => slot.available_table_count === 0) ? (
                        <p className="text-sm text-muted">Không còn bàn trống cho ngày/giờ này. Thử ngày khác nhé.</p>
                    ) : (
                        <div>
                            <p className="mb-2 font-display text-[11px] font-bold uppercase tracking-wide text-muted">Chọn giờ</p>
                            <div className="flex flex-wrap gap-1.5">
                                {availability.time_slots.map((slot) => (
                                    <button
                                        key={slot.time}
                                        type="button"
                                        disabled={slot.available_table_count === 0}
                                        onClick={() => {
                                            setSelectedTime(slot.time);
                                            setSelectedTableId(null);
                                        }}
                                        className={[
                                            "rounded-lg border-[1.5px] px-3 py-1.5 text-[13px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-30",
                                            selectedTime === slot.time
                                                ? "border-amber-border bg-amber-wash text-amber"
                                                : "border-border-strong text-muted hover:border-amber-border hover:text-amber",
                                        ].join(" ")}
                                    >
                                        {slot.time}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {selectedTime && (
                        <div>
                            <p className="mb-2 font-display text-[11px] font-bold uppercase tracking-wide text-muted">Chọn bàn</p>
                            {availableTablesForTime.length === 0 ? (
                                <p className="text-sm text-muted">Không có bàn phù hợp cho khung giờ này.</p>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    {availableTablesForTime.map((table) => (
                                        <label
                                            key={table.id}
                                            className={[
                                                "flex cursor-pointer items-center justify-between rounded-lg border-[1.5px] px-3 py-2.5 text-sm transition-colors",
                                                selectedTableId === table.id
                                                    ? "border-amber-border bg-amber-wash"
                                                    : "border-border-strong hover:border-amber-border/60",
                                            ].join(" ")}
                                        >
                                            <span className="flex items-center gap-2">
                                                <input
                                                    type="radio"
                                                    name="table"
                                                    className="accent-amber"
                                                    checked={selectedTableId === table.id}
                                                    onChange={() => setSelectedTableId(table.id)}
                                                />
                                                <span>
                                                    <span className="font-semibold text-white">{table.table_name}</span>
                                                    <span className="ml-1.5 text-xs text-muted">· {table.capacity} khách</span>
                                                </span>
                                            </span>
                                            <span className="text-xs text-muted">
                                                {table.deposit_required > 0 ? `Cọc ${formatVnd(table.deposit_required)}` : "Không cọc"}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {selectedTable && (
                        <form onSubmit={handleSubmitBooking} className="flex flex-col gap-3 border-t border-border pt-4">
                            <FieldGroup label="Ghi chú (không bắt buộc)">
                                <Textarea
                                    value={specialRequests}
                                    onChange={(event) => setSpecialRequests(event.target.value)}
                                    placeholder="Sinh nhật, gần sân khấu, dị ứng..."
                                    className="min-h-16"
                                />
                            </FieldGroup>
                            <FieldGroup label="Hình thức thanh toán">
                                <Select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as typeof paymentMethod)}>
                                    {PAYMENT_METHODS.map((method) => (
                                        <option key={method.value} value={method.value}>
                                            {method.label}
                                        </option>
                                    ))}
                                </Select>
                            </FieldGroup>

                            {selectedTable.deposit_required > 0 && (
                                <p className="text-xs text-muted">
                                    Tiền đặt cọc: <span className="font-semibold text-amber">{formatVnd(selectedTable.deposit_required)}</span>
                                </p>
                            )}

                            {requiresLogin && (
                                <Alert>
                                    Vui lòng{" "}
                                    <a href={`/login?next=/venues/${slug}`} className="font-semibold underline">
                                        đăng nhập
                                    </a>{" "}
                                    để đặt bàn.
                                </Alert>
                            )}
                            {submitError && <Alert>{submitError}</Alert>}

                            <Button type="submit" disabled={submitting} className="w-full">
                                {submitting ? <Spinner /> : "Đặt bàn"}
                            </Button>
                        </form>
                    )}
                </div>
            )}
        </div>
    );
}
