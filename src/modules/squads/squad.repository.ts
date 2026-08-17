import { createAdminClient } from "@/lib/supabase/admin";
import { AuthException } from "@/modules/auth/auth.errors";
import { mapSquad, mapSquadMember } from "./squad.mapper";
import type {
    SquadMemberRecord,
    SquadMemberRow,
    SquadRecord,
    SquadRow,
    SquadStatus,
} from "./squad.types";

const SQUADS_TABLE = "squads";
const SQUAD_MEMBERS_TABLE = "squad_members";

type UpdateSquadRecord = Partial<Pick<SquadRow, "status" | "total_bill">>;
type UpdateSquadMemberRecord = Partial<Pick<SquadMemberRow, "status" | "share_amount" | "paid">>;

export class SquadRepository {
    private get supabase() {
        return createAdminClient();
    }

    async create(input: SquadRecord) {
        const { data, error } = await this.supabase
            .from(SQUADS_TABLE)
            .insert(input)
            .select("*")
            .single<SquadRow>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return mapSquad(data);
    }

    async createMember(input: SquadMemberRecord) {
        const { data, error } = await this.supabase
            .from(SQUAD_MEMBERS_TABLE)
            .insert(input)
            .select("*")
            .single<SquadMemberRow>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return mapSquadMember(data);
    }

    async findByInviteCode(inviteCode: string) {
        const { data, error } = await this.supabase
            .from(SQUADS_TABLE)
            .select("*")
            .eq("invite_code", inviteCode)
            .maybeSingle<SquadRow>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return data ? mapSquad(data) : null;
    }

    async findById(id: string) {
        const { data, error } = await this.supabase
            .from(SQUADS_TABLE)
            .select("*")
            .eq("id", id)
            .maybeSingle<SquadRow>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return data ? mapSquad(data) : null;
    }

    async inviteCodeExists(inviteCode: string) {
        const { data, error } = await this.supabase
            .from(SQUADS_TABLE)
            .select("id")
            .eq("invite_code", inviteCode)
            .maybeSingle<{ id: string }>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return Boolean(data);
    }

    async listMembers(squadId: string) {
        const { data, error } = await this.supabase
            .from(SQUAD_MEMBERS_TABLE)
            .select("*")
            .eq("squad_id", squadId)
            .order("joined_at", { ascending: true })
            .returns<SquadMemberRow[]>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return (data ?? []).map(mapSquadMember);
    }

    async findMember(squadId: string, userId: string) {
        const { data, error } = await this.supabase
            .from(SQUAD_MEMBERS_TABLE)
            .select("*")
            .eq("squad_id", squadId)
            .eq("user_id", userId)
            .maybeSingle<SquadMemberRow>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return data ? mapSquadMember(data) : null;
    }

    async listMine(userId: string) {
        const { data: memberRows, error: memberError } = await this.supabase
            .from(SQUAD_MEMBERS_TABLE)
            .select("squad_id")
            .eq("user_id", userId)
            .returns<Array<{ squad_id: string }>>();

        if (memberError) {
            throw new AuthException(500, "DATABASE_ERROR", memberError.message);
        }

        const memberSquadIds = (memberRows ?? []).map((member) => member.squad_id);
        const { data, error } = await this.supabase
            .from(SQUADS_TABLE)
            .select("*")
            .or(`created_by.eq.${userId}${memberSquadIds.length ? `,id.in.(${memberSquadIds.join(",")})` : ""}`)
            .order("created_at", { ascending: false })
            .returns<SquadRow[]>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return (data ?? []).map(mapSquad);
    }

    async update(id: string, input: UpdateSquadRecord) {
        const { data, error } = await this.supabase
            .from(SQUADS_TABLE)
            .update(input)
            .eq("id", id)
            .select("*")
            .single<SquadRow>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return mapSquad(data);
    }

    async updateMembersShareAmount(squadId: string, shareAmount: number) {
        const { data, error } = await this.supabase
            .from(SQUAD_MEMBERS_TABLE)
            .update({ share_amount: shareAmount })
            .eq("squad_id", squadId)
            .eq("status", "joined")
            .select("*")
            .returns<SquadMemberRow[]>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return (data ?? []).map(mapSquadMember);
    }

    async updateMember(squadId: string, userId: string, input: UpdateSquadMemberRecord) {
        const { data, error } = await this.supabase
            .from(SQUAD_MEMBERS_TABLE)
            .update(input)
            .eq("squad_id", squadId)
            .eq("user_id", userId)
            .select("*")
            .single<SquadMemberRow>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return mapSquadMember(data);
    }

    async updateStatus(id: string, status: SquadStatus) {
        return this.update(id, { status });
    }
}
