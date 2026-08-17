import { createSiteUrl } from "@/config/site";
import {
    escapeHtml,
    renderEmailLayout,
    renderInfoRows,
    type EmailTemplate,
} from "./email-template";

interface MembershipEmailInput {
    user: {
        display_name: string;
        email: string;
    };
    subscription: {
        id: string;
        tier: string;
        amount: number;
        payment_method: string;
        payment_ref: string;
        expires_at?: string | null;
    };
}

export function renderMembershipPaymentReceivedEmail(input: MembershipEmailInput): EmailTemplate {
    const { user, subscription } = input;
    const title = "Membership payment received";
    const membershipUrl = createSiteUrl("/membership").toString();
    const body = `
        <p style="margin:0 0 16px;">Hi ${escapeHtml(user.display_name)},</p>
        <p style="margin:0 0 20px;">We received your VIP membership payment. Your membership is waiting for admin confirmation after payment reconciliation.</p>
        ${renderInfoRows([
            ["Subscription ID", subscription.id],
            ["Tier", formatTier(subscription.tier)],
            ["Amount", formatMoney(subscription.amount)],
            ["Payment method", subscription.payment_method],
            ["Payment ref", subscription.payment_ref],
        ])}
        <p style="margin:22px 0 0;">
            <a href="${membershipUrl}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:11px 16px;border-radius:6px;">View membership</a>
        </p>
    `;

    return {
        subject: title,
        html: renderEmailLayout(title, body),
        text: [
            `Hi ${user.display_name},`,
            "We received your VIP membership payment. Your membership is waiting for admin confirmation after payment reconciliation.",
            `Subscription ID: ${subscription.id}`,
            `Tier: ${formatTier(subscription.tier)}`,
            `Amount: ${formatMoney(subscription.amount)}`,
            `Payment method: ${subscription.payment_method}`,
            `Payment ref: ${subscription.payment_ref}`,
            `View membership: ${membershipUrl}`,
        ].join("\n"),
    };
}

export function renderMembershipActivatedEmail(input: MembershipEmailInput): EmailTemplate {
    const { user, subscription } = input;
    const title = "Membership activated";
    const membershipUrl = createSiteUrl("/membership").toString();
    const body = `
        <p style="margin:0 0 16px;">Hi ${escapeHtml(user.display_name)},</p>
        <p style="margin:0 0 20px;">Your VIP membership is now active.</p>
        ${renderInfoRows([
            ["Subscription ID", subscription.id],
            ["Tier", formatTier(subscription.tier)],
            ["Amount", formatMoney(subscription.amount)],
            ["Payment ref", subscription.payment_ref],
            ["Expires at", subscription.expires_at],
        ])}
        <p style="margin:22px 0 0;">
            <a href="${membershipUrl}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:11px 16px;border-radius:6px;">View membership</a>
        </p>
    `;

    return {
        subject: title,
        html: renderEmailLayout(title, body),
        text: [
            `Hi ${user.display_name},`,
            "Your VIP membership is now active.",
            `Subscription ID: ${subscription.id}`,
            `Tier: ${formatTier(subscription.tier)}`,
            `Amount: ${formatMoney(subscription.amount)}`,
            `Payment ref: ${subscription.payment_ref}`,
            `Expires at: ${subscription.expires_at ?? "-"}`,
            `View membership: ${membershipUrl}`,
        ].join("\n"),
    };
}

function formatTier(tier: string) {
    return tier
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}

function formatMoney(amount: number) {
    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0,
    }).format(amount);
}
