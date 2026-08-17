import { AuthRepository } from "@/modules/auth/auth.repository";
import { EventRepository } from "@/modules/events/event.repository";
import { TicketTierRepository } from "@/modules/ticket-tiers/ticket-tier.repository";
import { NotificationService } from "./notification.service";
import {
    createTicketsPdfAttachment,
    renderTicketsIssuedEmail,
} from "./templates/ticket-email.templates";

export class TicketNotificationService {
    constructor(
        private authRepository = new AuthRepository(),
        private eventRepository = new EventRepository(),
        private ticketTierRepository = new TicketTierRepository(),
        private notificationService = new NotificationService()
    ) { }

    async sendTicketsIssued(input: {
        order: {
            id: string;
            user_id: string;
            event_id: string;
            tier_id: string;
            quantity: number;
            total_amount: number;
            payment_method: string | null;
        };
        tickets: Array<{
            ticket_code: string;
            qr_url: string;
        }>;
    }) {
        if (!this.notificationService.isEmailConfigured()) {
            console.warn("Skipping ticket email because RESEND_API_KEY is not configured", {
                order_id: input.order.id,
            });
            return;
        }

        const [user, event, tier] = await Promise.all([
            this.authRepository.findById(input.order.user_id),
            this.eventRepository.findAnyById(input.order.event_id),
            this.ticketTierRepository.findById(input.order.tier_id),
        ]);

        if (!user || !event || !tier) {
            console.warn("Skipping ticket email because user, event, or tier was not found", {
                order_id: input.order.id,
                user_id: input.order.user_id,
                event_id: input.order.event_id,
                tier_id: input.order.tier_id,
            });
            return;
        }

        const email = renderTicketsIssuedEmail({
            user,
            event,
            tier,
            order: input.order,
            tickets: input.tickets,
        });

        const attachment = createTicketsPdfAttachment({
            event,
            tier,
            order: input.order,
            tickets: input.tickets,
        });

        try {
            await this.notificationService.sendEmail({
                to: user.email,
                subject: email.subject,
                html: email.html,
                text: email.text,
                attachments: [attachment],
            });
        } catch (error) {
            console.error("Ticket email failed", {
                order_id: input.order.id,
                error,
            });
        }
    }
}
