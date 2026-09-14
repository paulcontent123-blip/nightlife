import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { serverFetch } from "@/lib/api/server";
import { ApiError } from "@/lib/api/envelope";
import type { MembershipMineResult, MembershipTiersResult } from "@/lib/api/types";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Alert } from "@/components/ui/Alert";
import { LinkButton } from "@/components/ui/LinkButton";
import { MembershipTierCard } from "@/components/membership/MembershipTierCard";
import { MembershipSubscribeButton } from "@/components/membership/MembershipSubscribeButton";
import { CancelAutoRenewalButton } from "@/components/membership/CancelAutoRenewalButton";
import { formatDate, MEMBERSHIP_TIER_LABEL } from "@/lib/format";

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("Membership");
    return { title: t("metaTitle") };
}

interface PageProps {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function MembershipPage({ searchParams }: PageProps) {
    const t = await getTranslations("Membership");
    const query = await searchParams;
    const paymentResult = typeof query.payment === "string" ? query.payment : undefined;

    // Independent of one another — kick off both requests before awaiting either.
    const tiersPromise = serverFetch<MembershipTiersResult>("/api/v1/membership/tiers");
    const minePromise = serverFetch<MembershipMineResult>("/api/v1/membership/mine").catch((error) => {
        if (error instanceof ApiError && error.status === 401) {
            return null;
        }

        throw error;
    });

    const [tiers, mine] = await Promise.all([tiersPromise, minePromise]);

    const pending = mine?.pending_subscription ?? null;
    const subscriptionStatusLabels: Record<string, string> = {
        pending_payment: t("statusPendingPayment"),
        payment_received: t("statusPaymentReceived"),
        active: t("statusActive"),
        expired: t("statusExpired"),
        rejected: t("statusRejected"),
        cancelled: t("statusCancelled"),
    };

    return (
        <div className="mx-auto min-w-0 max-w-5xl px-5 py-12 sm:px-10 sm:py-16">
            <SectionHeading
                tag={t("eyebrow")}
                title={
                    <>
                        {t("title")}
                        <br />
                        <em className="not-italic text-amber">{t("subtitle")}</em>
                    </>
                }
                description={t("description")}
            />

            {mine && paymentResult === "success" && (
                <div className="mt-6">
                    <Alert tone="success">{t("paymentSuccess")}</Alert>
                </div>
            )}
            {mine && paymentResult === "failed" && (
                <div className="mt-6">
                    <Alert>{t("paymentFailed")}</Alert>
                </div>
            )}

            {mine ? (
                <div className="mt-6 rounded-xl border border-border bg-void-2 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <p className="text-xs font-semibold uppercase text-muted">{t("currentPlan")}</p>
                            <p className="font-display text-xl font-extrabold text-amber">{MEMBERSHIP_TIER_LABEL[mine.membership.tier]}</p>
                            {mine.membership.expires_at && (
                                <p className="mt-1 text-xs text-muted">
                                    {t("expires")}: {formatDate(mine.membership.expires_at.slice(0, 10))}
                                    {mine.membership.auto_renewal ? ` · ${t("autoRenew")}` : ""}
                                </p>
                            )}
                        </div>
                        {mine.membership.status === "active" && mine.membership.auto_renewal && <CancelAutoRenewalButton />}
                    </div>

                    {pending && (
                        <div className="mt-4">
                            <Alert tone="info">
                                {t("pendingStatus", {
                                    tier: MEMBERSHIP_TIER_LABEL[pending.tier],
                                    status: subscriptionStatusLabels[pending.status] ?? pending.status,
                                })}{" "}
                                {pending.status === "pending_payment" && t("completePayment")}
                                {pending.status === "payment_received" && t("waitingApproval")} {t("transactionCode")}: {" "}
                                <span className="break-all font-mono">{pending.payment_ref}</span>
                            </Alert>
                        </div>
                    )}
                </div>
            ) : (
                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-border bg-amber-wash p-5">
                    <p className="text-sm text-white">
                        {t("loginPrompt")}
                    </p>
                    <LinkButton href="/login?next=/membership" size="sm">
                        {t("login")}
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
                                    {t("free")}
                                </div>
                            ) : !mine ? (
                                <LinkButton href="/login?next=/membership" variant="secondary" className="w-full">
                                    {t("loginToSubscribe")}
                                </LinkButton>
                            ) : (
                                <MembershipSubscribeButton
                                    tier={tier.tier}
                                    disabledReason={pending ? t("pendingReason") : undefined}
                                />
                            )}
                        </MembershipTierCard>
                    );
                })}
            </div>
        </div>
    );
}
