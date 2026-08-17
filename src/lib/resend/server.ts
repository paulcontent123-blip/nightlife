import { Resend } from "resend";
import type { Attachment } from "resend";
import {
    getResendApiKey,
    getResendFromEmail,
    resendConfig,
} from "@/config/resend";

type SendEmailInput = {
    to: string | string[];
    subject: string;
    html: string;
    text?: string;
    from?: string;
    replyTo?: string | string[];
    attachments?: Attachment[];
};

let resendClient: Resend | null = null;

export function getResendClient() {
    resendClient ??= new Resend(getResendApiKey());

    return resendClient;
}

export async function sendEmail(input: SendEmailInput) {
    return getResendClient().emails.send({
        from: input.from ?? getResendFromEmail(),
        to: input.to,
        subject: input.subject,
        html: input.html,
        ...(input.text ? { text: input.text } : {}),
        ...(input.attachments ? { attachments: input.attachments } : {}),
        ...(input.replyTo || resendConfig.replyTo
            ? { replyTo: input.replyTo ?? resendConfig.replyTo }
            : {}),
    });
}
