import type { Attachment } from "resend";
import { isResendConfigured } from "@/config/resend";
import { sendEmail } from "@/lib/resend/server";

export interface EmailMessage {
    to: string | string[];
    subject: string;
    html: string;
    text?: string;
    from?: string;
    replyTo?: string | string[];
    attachments?: Attachment[];
}

export class EmailProvider {
    isConfigured() {
        return isResendConfigured();
    }

    async send(input: EmailMessage) {
        if (!this.isConfigured()) {
            return {
                sent: false,
                skipped: true,
                reason: "missing_resend_api_key",
            };
        }

        await sendEmail(input);

        return {
            sent: true,
            skipped: false,
        };
    }
}
