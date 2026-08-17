export interface EmailTemplate {
    subject: string;
    html: string;
    text: string;
}

export function renderEmailLayout(title: string, body: string) {
    return `
        <!doctype html>
        <html>
            <body style="margin:0;padding:0;background:#f6f7f9;font-family:Arial,sans-serif;color:#111827;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f7f9;padding:24px;">
                    <tr>
                        <td align="center">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;">
                                <tr>
                                    <td style="padding:24px 28px;border-bottom:1px solid #e5e7eb;">
                                        <div style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;">Nightlife</div>
                                        <h1 style="margin:8px 0 0;font-size:22px;line-height:1.3;color:#111827;">${escapeHtml(title)}</h1>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding:28px;">
                                        ${body}
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
        </html>
    `;
}

export function renderInfoRows(rows: Array<[string, string | number | null | undefined]>) {
    return `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
            ${rows.map(([label, value]) => `
                <tr>
                    <td style="padding:10px 0;color:#6b7280;width:160px;border-bottom:1px solid #f3f4f6;">${escapeHtml(label)}</td>
                    <td style="padding:10px 0;color:#111827;border-bottom:1px solid #f3f4f6;">${escapeHtml(String(value ?? "-"))}</td>
                </tr>
            `).join("")}
        </table>
    `;
}

export function escapeHtml(value: string) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
