import type { Metadata } from "next";
import { serverFetch } from "@/lib/api/server";
import { ApiError } from "@/lib/api/envelope";
import type { MembershipMineResult, MembershipTiersResult } from "@/lib/api/types";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Alert } from "@/components/ui/Alert";
import { LinkButton } from "@/components/ui/LinkButton";
import { MembershipTierCard } from "@/components/membership/MembershipTierCard";
import { MembershipSubscribeButton } from "@/components/membership/MembershipSubscribeButton";
import { CancelAutoRenewalButton } from "@/components/membership/CancelAutoRenewalButton";
import { formatDate, MEMBERSHIP_SUB_STATUS_LABEL, MEMBERSHIP_TIER_LABEL } from "@/lib/format";

export const metadata: Metadata = { title: "VIP Membership · Nightlife.vn" };

interface PageProps {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function MembershipPage({ searchParams }: PageProps) {
    const query = await searchParams;
    const paymentResult = typeof query.payment === "string" ? query.payment : undefined;

    const tiers = await serverFetch<MembershipTiersResult>("/api/v1/membership/tiers");

    let mine: MembershipMineResult | null = null;

    try {
        mine = await serverFetch<MembershipMineResult>("/api/v1/membership/mine");
    } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 401) {
            throw error;
        }
    }

    const pending = mine?.pending_subscription ?? null;

    return (
        <div className="mx-auto max-w-5xl px-5 py-16 sm:px-10">
            <SectionHeading
                tag="VIP Membership"
                title={
                    <>
                        Nâng cấp trải nghiệm
                        <br />
                        <em className="not-italic text-amber">đêm của bạn</em>
                    </>
                }
                description="Thành viên VIP được ưu tiên đặt bàn, deals độc quyền và trải nghiệm nightlife ở cấp độ khác hoàn toàn."
            />

            {mine && paymentResult === "success" && (
                <div className="mt-6">
                    <Alert tone="success">Thanh toán mô phỏng thành công. Đăng ký đang chờ admin xác nhận.</Alert>
                </div>
            )}
            {mine && paymentResult === "failed" && (
                <div className="mt-6">
                    <Alert>Giao dịch mô phỏng thất bại. Vui lòng thử đăng ký lại.</Alert>
                </div>
            )}

            {mine ? (
                <div className="mt-6 rounded-xl border border-border bg-void-2 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Gói hiện tại</p>
                            <p className="font-display text-xl font-extrabold text-amber">{MEMBERSHIP_TIER_LABEL[mine.membership.tier]}</p>
                            {mine.membership.expires_at && (
                                <p className="mt-1 text-xs text-muted">
                                    Hết hạn: {formatDate(mine.membership.expires_at.slice(0, 10))}
                                    {mine.membership.auto_renewal ? " · Tự động gia hạn" : ""}
                                </p>
                            )}
                        </div>
                        {mine.membership.status === "active" && mine.membership.auto_renewal && <CancelAutoRenewalButton />}
                    </div>

                    {pending && (
                        <div className="mt-4">
                            <Alert tone="info">
                                Bạn có đăng ký gói <span className="font-semibold">{MEMBERSHIP_TIER_LABEL[pending.tier]}</span> đang ở
                                trạng thái <span className="font-semibold">{MEMBERSHIP_SUB_STATUS_LABEL[pending.status]}</span>
                                {pending.status === "pending_payment" && " — hoàn tất thanh toán để tiếp tục."}
                                {pending.status === "payment_received" && " — chúng tôi sẽ kích hoạt trong thời gian sớm nhất."} Mã
                                giao dịch: <span className="font-mono">{pending.payment_ref}</span>
                            </Alert>
                        </div>
                    )}
                </div>
            ) : (
                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-border bg-amber-wash p-5">
                    <p className="text-sm text-white">
                        Đăng nhập để xem gói hiện tại của bạn và đăng ký nâng cấp VIP.
                    </p>
                    <LinkButton href="/login?next=/membership" size="sm">
                        Đăng nhập
                    </LinkButton>
                </div>
            )}

            <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
                {tiers.items.map((tier) => {
                    const isCurrent = mine ? mine.membership.tier === tier.tier : false;

                    return (
                        <MembershipTierCard key={tier.tier} tier={tier} isCurrent={isCurrent} isFeatured={tier.tier === "night_pass"}>
                            {tier.tier === "free" ? (
                                <div className="rounded-lg border-[1.5px] border-border-strong py-2.5 text-center text-xs text-muted">
                                    Miễn phí
                                </div>
                            ) : !mine ? (
                                <LinkButton href="/login?next=/membership" variant="secondary" className="w-full">
                                    Đăng nhập để đăng ký
                                </LinkButton>
                            ) : (
                                <MembershipSubscribeButton
                                    tier={tier.tier}
                                    disabledReason={pending ? "Bạn đang có đăng ký chờ xử lý" : undefined}
                                />
                            )}
                        </MembershipTierCard>
                    );
                })}
            </div>
        </div>
    );
}
