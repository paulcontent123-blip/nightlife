import { randomBytes } from "crypto";
import { createSiteUrl } from "@/config/site";
import { AuthException } from "@/modules/auth/auth.errors";
import type { UserProfile } from "@/modules/auth/auth.types";
import { BookingRepository } from "@/modules/bookings/booking.repository";
import {
    incrementVenueAvailabilityCacheVersion,
    incrementVenueListCacheVersion,
} from "@/modules/venues/venue-cache";
import { VenueRepository } from "@/modules/venues/venue.repository";
import { SquadRepository } from "./squad.repository";
import { CreateSquadSchema, SplitBillSchema } from "./squad.validator";
import type { CreateSquadDTO, SplitBillDTO } from "./squad.types";

export class SquadService {
    constructor(
        private repository = new SquadRepository(),
        private venueRepository = new VenueRepository(),
        private bookingRepository = new BookingRepository()
    ) { }

    // Host creates a shareable squad and is added as the first joined member.
    async createSquad(input: CreateSquadDTO, host: UserProfile) {
        const dto = CreateSquadSchema.parse(input);
        const venue = await this.venueRepository.findById(dto.venue_id);

        if (!venue || !venue.status.is_active) {
            throw new AuthException(404, "VENUE_NOT_FOUND");
        }

        const inviteCode = await this.createUniqueInviteCode();
        const squad = await this.repository.create({
            invite_code: inviteCode,
            created_by: host.id,
            venue_id: dto.venue_id,
            booking_date: dto.booking_date,
            booking_time: dto.booking_time,
            party_size: dto.party_size,
            budget_per_person: dto.budget_per_person,
            status: "forming",
            bill_splitting: true,
            total_bill: null,
        });

        await this.repository.createMember({
            squad_id: squad.id,
            user_id: host.id,
            role: "host",
            status: "joined",
            share_amount: null,
            paid: false,
        });

        return {
            squad_id: squad.id,
            invite_code: squad.invite_code,
            invite_url: this.createInviteUrl(squad.invite_code),
        };
    }

    // Public share endpoint for invite links; no auth required.
    async getSquadByInviteCode(inviteCode: string) {
        const squad = await this.getExistingSquadByInviteCode(inviteCode);
        const members = await this.repository.listMembers(squad.id);
        const joinedMembers = members.filter((member) => member.status === "joined");

        return {
            ...squad,
            invite_url: this.createInviteUrl(squad.invite_code),
            member_count: joinedMembers.length,
            remaining_slots: Math.max(squad.party_size - joinedMembers.length, 0),
            members: joinedMembers.map((member) => ({
                id: member.id,
                role: member.role,
                status: member.status,
                paid: member.paid,
                joined_at: member.joined_at,
            })),
        };
    }

    // Authenticated user joins a forming squad when slots are available.
    async joinSquad(inviteCode: string, user: UserProfile) {
        const squad = await this.getExistingSquadByInviteCode(inviteCode);

        if (squad.status !== "forming") {
            throw new AuthException(409, "SQUAD_CANNOT_BE_CONFIRMED", "Squad is not accepting new members");
        }

        const existingMember = await this.repository.findMember(squad.id, user.id);

        if (existingMember?.status === "joined") {
            throw new AuthException(409, "SQUAD_ALREADY_JOINED");
        }

        const members = await this.repository.listMembers(squad.id);
        const joinedCount = members.filter((member) => member.status === "joined").length;

        if (joinedCount >= squad.party_size) {
            throw new AuthException(409, "SQUAD_FULL");
        }

        if (existingMember) {
            return this.repository.updateMember(squad.id, user.id, {
                status: "joined",
            });
        }

        return this.repository.createMember({
            squad_id: squad.id,
            user_id: user.id,
            role: "member",
            status: "joined",
            share_amount: null,
            paid: false,
        });
    }

    // Host confirms the squad and creates a booking using the first available matching table.
    async confirmSquad(id: string, user: UserProfile) {
        const squad = await this.getExistingSquadById(id);

        this.ensureHost(squad.created_by, user);

        if (squad.status !== "forming") {
            throw new AuthException(409, "SQUAD_CANNOT_BE_CONFIRMED");
        }

        const table = await this.findAvailableTableForSquad(squad);
        const booking = await this.bookingRepository.create({
            venue_id: squad.venue_id,
            table_id: table.id,
            user_id: squad.created_by,
            squad_id: squad.id,
            booking_date: squad.booking_date,
            booking_time: squad.booking_time,
            party_size: squad.party_size,
            status: "pending",
            special_requests: `Squad booking ${squad.invite_code}`,
            deposit_amount: table.deposit_required,
            deposit_paid: false,
            payment_ref: null,
        });
        const updatedSquad = await this.repository.updateStatus(squad.id, "confirmed");

        await this.afterSquadBookingMutation(squad.venue_id);

        return {
            squad: updatedSquad,
            booking,
            table,
        };
    }

    // Host splits the final bill evenly across joined members and returns internal payment links.
    async splitBill(id: string, input: SplitBillDTO, user: UserProfile) {
        const squad = await this.getExistingSquadById(id);

        this.ensureHost(squad.created_by, user);

        const dto = SplitBillSchema.parse(input);
        const members = await this.repository.listMembers(squad.id);
        const joinedMembers = members.filter((member) => member.status === "joined");

        if (joinedMembers.length === 0) {
            throw new AuthException(409, "SQUAD_NOT_JOINED");
        }

        const perPersonAmount = Math.ceil(dto.total_amount / joinedMembers.length);
        const updatedMembers = await this.repository.updateMembersShareAmount(squad.id, perPersonAmount);

        await this.repository.update(squad.id, {
            total_bill: dto.total_amount,
        });

        return {
            per_person_amount: perPersonAmount,
            payment_links: updatedMembers.map((member) => ({
                member_id: member.id,
                user_id: member.user_id,
                amount: perPersonAmount,
                paid: member.paid,
                payment_url: this.createMemberPaymentUrl(squad.id),
            })),
        };
    }

    // Joined member marks their share as paid; real payment provider comes in Payment phase.
    async payShare(id: string, user: UserProfile) {
        const squad = await this.getExistingSquadById(id);
        const member = await this.repository.findMember(squad.id, user.id);

        if (!member || member.status !== "joined") {
            throw new AuthException(403, "SQUAD_NOT_JOINED");
        }

        if (!member.share_amount) {
            throw new AuthException(409, "SQUAD_BILL_NOT_SPLIT");
        }

        return this.repository.updateMember(squad.id, user.id, {
            paid: true,
        });
    }

    // Returns squads where the current user is host or member.
    async listMine(user: UserProfile) {
        const squads = await this.repository.listMine(user.id);

        return {
            items: squads.map((squad) => ({
                ...squad,
                invite_url: this.createInviteUrl(squad.invite_code),
            })),
        };
    }

    private async getExistingSquadByInviteCode(inviteCode: string) {
        const squad = await this.repository.findByInviteCode(inviteCode);

        if (!squad) {
            throw new AuthException(404, "SQUAD_NOT_FOUND");
        }

        return squad;
    }

    private async getExistingSquadById(id: string) {
        const squad = await this.repository.findById(id);

        if (!squad) {
            throw new AuthException(404, "SQUAD_NOT_FOUND");
        }

        return squad;
    }

    private ensureHost(hostId: string, user: UserProfile) {
        if (hostId !== user.id && user.role !== "admin") {
            throw new AuthException(403, "SQUAD_HOST_REQUIRED");
        }
    }

    private async findAvailableTableForSquad(squad: Awaited<ReturnType<SquadRepository["findById"]>>) {
        if (!squad) {
            throw new AuthException(404, "SQUAD_NOT_FOUND");
        }

        const tables = await this.venueRepository.listEligibleTables(squad.venue_id, squad.party_size);
        const bookings = await this.venueRepository.listBlockingBookings(squad.venue_id, {
            date: squad.booking_date,
            party_size: squad.party_size,
        });
        const bookedTableIds = new Set(
            bookings
                .filter((booking) => normalizeTime(booking.booking_time) === squad.booking_time)
                .map((booking) => booking.table_id)
                .filter((tableId): tableId is string => Boolean(tableId))
        );
        const table = tables.find((candidate) => !bookedTableIds.has(candidate.id));

        if (!table) {
            throw new AuthException(409, "VENUE_TABLE_UNAVAILABLE");
        }

        return table;
    }

    private async createUniqueInviteCode() {
        let inviteCode = this.createInviteCode();

        while (await this.repository.inviteCodeExists(inviteCode)) {
            inviteCode = this.createInviteCode();
        }

        return inviteCode;
    }

    private createInviteCode() {
        return randomBytes(4).toString("hex").toUpperCase();
    }

    private createInviteUrl(inviteCode: string) {
        return createSiteUrl(`/squad/${inviteCode}`).toString();
    }

    private createMemberPaymentUrl(squadId: string) {
        return createSiteUrl(`/squad/${squadId}/pay`).toString();
    }

    private async afterSquadBookingMutation(venueId: string) {
        await Promise.all([
            incrementVenueAvailabilityCacheVersion(venueId),
            incrementVenueListCacheVersion(),
            this.bookingRepository.refreshVenueBookingSummary(venueId),
        ]);
    }
}

function normalizeTime(value: string) {
    const match = value.match(/^(\d{2}:\d{2})/);

    return match?.[1] ?? value;
}
