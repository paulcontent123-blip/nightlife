import type { PassportReward } from "./passport.types";

export const PASSPORT_POINTS = {
    VENUE_CHECKIN: 10,
    VENUE_REVIEW: 5,
    TICKET_ORDER: 15,
} as const;

export const PASSPORT_REWARDS: PassportReward[] = [
    {
        id: "free_drink_voucher",
        title: "1 free drink voucher",
        points: 100,
        description: "Redeem 100 points for a free drink voucher.",
        fulfillment: "voucher_pending",
    },
    {
        id: "free_cover_charge",
        title: "Free cover charge at 1 venue",
        points: 300,
        description: "Redeem 300 points for one free cover charge reward.",
        fulfillment: "voucher_pending",
    },
    {
        id: "night_pass_month",
        title: "1 month Night Pass",
        points: 500,
        description: "Redeem 500 points for one month of Night Pass.",
        fulfillment: "membership_pending",
    },
    {
        id: "black_card_month",
        title: "1 month Black Card",
        points: 1000,
        description: "Redeem 1000 points for one month of Black Card.",
        fulfillment: "membership_pending",
    },
];
