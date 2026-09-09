import { AuthException } from "@/modules/auth/auth.errors";
import type { UserProfile } from "@/modules/auth/auth.types";
import { PASSPORT_POINTS, PASSPORT_REWARDS } from "./passport.constants";
import { PassportRepository } from "./passport.repository";
import {
    AdminPassportTransactionQuerySchema,
    PassportMineQuerySchema,
    PassportRedeemSchema,
} from "./passport.validator";
import type {
    PassportPointSourceType,
    PassportRedeemDTO,
} from "./passport.types";

export class PassportService {
    constructor(
        private repository = new PassportRepository()
    ) { }

    async awardVenueCheckinPoints(input: { userId: string; venueId: string; bookingId: string }) {
        return this.awardPoints({
            userId: input.userId,
            points: PASSPORT_POINTS.VENUE_CHECKIN,
            sourceType: "venue_checkin",
            sourceId: input.bookingId,
            description: `Venue check-in reward for venue ${input.venueId} and booking ${input.bookingId}`,
        });
    }

    async getMine(user: UserProfile, searchParams: URLSearchParams) {
        const query = PassportMineQuerySchema.parse(Object.fromEntries(searchParams));
        const [points, transactions, checkins] = await Promise.all([
            this.repository.findUserPoints(user.id),
            this.repository.listTransactions(user.id, query),
            this.repository.listCheckins(user.id),
        ]);

        return {
            points,
            history: transactions,
            checkins,
        };
    }

    async listAdminTransactions(searchParams: URLSearchParams) {
        const query = AdminPassportTransactionQuerySchema.parse(Object.fromEntries(searchParams));

        return this.repository.listAllTransactions(query);
    }

    listRewards(user: UserProfile) {
        return {
            points: user.nightlife_passport_points,
            items: PASSPORT_REWARDS.map((reward) => ({
                ...reward,
                redeemable: user.nightlife_passport_points >= reward.points,
            })),
        };
    }

    async redeem(input: PassportRedeemDTO, user: UserProfile) {
        const dto = PassportRedeemSchema.parse(input);
        const reward = PASSPORT_REWARDS.find((item) => item.id === dto.reward_id);

        if (!reward) {
            throw new AuthException(404, "PASSPORT_REWARD_NOT_FOUND");
        }

        const currentPoints = await this.repository.findUserPoints(user.id);

        if (currentPoints < reward.points) {
            throw new AuthException(409, "PASSPORT_INSUFFICIENT_POINTS");
        }

        const sourceId = `${reward.id}:${crypto.randomUUID()}`;
        const transaction = await this.addPointTransaction({
            userId: user.id,
            points: -reward.points,
            sourceType: "reward_redeem",
            sourceId,
            description: `Redeemed reward: ${reward.title}`,
        });

        return {
            reward,
            transaction,
            balance: transaction.balance_after,
            fulfillment: {
                status: reward.fulfillment,
                note: reward.fulfillment === "membership_pending"
                    ? "Membership reward redemption is recorded. Admin fulfillment can be added in the next phase."
                    : "Voucher redemption is recorded. Voucher issuance can be added in the next phase.",
            },
        };
    }

    async awardVenueReviewPoints(input: { userId: string; reviewId: string }) {
        return this.awardPoints({
            userId: input.userId,
            points: PASSPORT_POINTS.VENUE_REVIEW,
            sourceType: "venue_review",
            sourceId: input.reviewId,
            description: `Venue review reward for review ${input.reviewId}`,
        });
    }

    async awardTicketOrderPoints(input: { userId: string; orderId: string }) {
        return this.awardPoints({
            userId: input.userId,
            points: PASSPORT_POINTS.TICKET_ORDER,
            sourceType: "ticket_order",
            sourceId: input.orderId,
            description: `Ticket order reward for order ${input.orderId}`,
        });
    }

    private async awardPoints(input: {
        userId: string;
        points: number;
        sourceType: PassportPointSourceType;
        sourceId: string;
        description: string;
    }) {
        const existingTransaction = await this.repository.findTransaction(
            input.userId,
            input.sourceType,
            input.sourceId
        );

        if (existingTransaction) {
            return {
                awarded: false,
                transaction: existingTransaction,
                balance: existingTransaction.balance_after,
            };
        }

        const transaction = await this.addPointTransaction(input);

        return {
            awarded: true,
            transaction,
            balance: transaction.balance_after,
        };
    }

    private async addPointTransaction(input: {
        userId: string;
        points: number;
        sourceType: PassportPointSourceType;
        sourceId: string;
        description: string;
    }) {
        const currentPoints = await this.repository.findUserPoints(input.userId);
        const nextPoints = currentPoints + input.points;

        if (nextPoints < 0) {
            throw new AuthException(409, "PASSPORT_INSUFFICIENT_POINTS");
        }

        const transaction = await this.repository.createTransaction({
            user_id: input.userId,
            points: input.points,
            balance_after: nextPoints,
            source_type: input.sourceType,
            source_id: input.sourceId,
            description: input.description,
        });

        await this.repository.updateUserPoints(input.userId, transaction?.balance_after ?? nextPoints);
        await this.notifyPassportMilestones({
            userId: input.userId,
            before: currentPoints,
            after: transaction?.balance_after ?? nextPoints,
        });

        return transaction ?? {
            id: "",
            user_id: input.userId,
            points: input.points,
            balance_after: nextPoints,
            source_type: input.sourceType,
            source_id: input.sourceId,
            description: input.description,
            created_at: new Date().toISOString(),
        };
    }

    private async notifyPassportMilestones(input: {
        userId: string;
        before: number;
        after: number;
    }) {
        const { NotificationJobService } = await import("@/modules/notifications/jobs/notification-job.service");
        const notificationJobService = new NotificationJobService();
        const milestones = notificationJobService.getPassportMilestonesCrossed({
            before: input.before,
            after: input.after,
        });

        if (milestones.length === 0) {
            return [];
        }

        const results = [];

        for (const milestone of milestones) {
            try {
                results.push(await notificationJobService.notifyPassportMilestoneNow({
                    userId: input.userId,
                    milestone,
                    balance: input.after,
                }));
            } catch (error) {
                console.error("Passport milestone push failed", {
                    user_id: input.userId,
                    milestone,
                    error,
                });
                results.push(null);
            }
        }

        return results;
    }
}
