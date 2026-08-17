import { createAdminClient } from "@/lib/supabase/admin";
import { AuthException } from "@/modules/auth/auth.errors";
import { mapEvent } from "@/modules/events/event.mapper";
import type { EventRow } from "@/modules/events/event.types";
import { mapTicket, mapTicketOrder } from "./ticket-sales.mapper";
import type {
    AdminTicketOrderListQuery,
    CreateTicketOrderInput,
    TicketListQuery,
    TicketOrderRow,
    TicketRow,
    TicketTierSaleRow,
} from "./ticket-sales.types";

const EVENTS_TABLE = "events";
const TICKET_ORDERS_TABLE = "ticket_orders";
const TICKET_TIERS_TABLE = "ticket_tiers";
const TICKETS_TABLE = "tickets";

export class TicketSalesRepository {
    private get supabase() {
        return createAdminClient();
    }

    async findPublicEventBySlug(slug: string) {
        const { data, error } = await this.supabase
            .from(EVENTS_TABLE)
            .select("*")
            .eq("slug", slug)
            .eq("is_active", true)
            .maybeSingle<EventRow>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return data ? mapEvent(data) : null;
    }

    async findTierForEvent(eventId: string, tierId: string) {
        const { data, error } = await this.supabase
            .from(TICKET_TIERS_TABLE)
            .select("*")
            .eq("id", tierId)
            .eq("event_id", eventId)
            .maybeSingle<TicketTierSaleRow>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return data;
    }

    async countPendingLockedTickets(tierId: string) {
        const { count, error } = await this.supabase
            .from(TICKETS_TABLE)
            .select("id, ticket_orders!inner(status, created_at)", { count: "exact", head: true })
            .eq("tier_id", tierId)
            .eq("status", "valid")
            .eq("ticket_orders.status", "pending");

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return count ?? 0;
    }

    async createTicketOrder(input: CreateTicketOrderInput) {
        const { data, error } = await this.supabase
            .from(TICKET_ORDERS_TABLE)
            .insert({
                user_id: input.userId,
                event_id: input.eventId,
                total_amount: input.totalAmount,
                platform_fee: input.platformFee,
                status: "pending",
                payment_method: input.paymentMethod,
                payment_ref: input.paymentRef,
            })
            .select("*")
            .single<TicketOrderRow>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return mapTicketOrder(data);
    }

    async createPendingOrderTickets(input: {
        orderId: string;
        eventId: string;
        tierId: string;
        userId: string;
        quantity: number;
        codes: string[];
    }) {
        const records = Array.from({ length: input.quantity }, (_, index) => ({
            tier_id: input.tierId,
            event_id: input.eventId,
            user_id: input.userId,
            order_id: input.orderId,
            ticket_code: input.codes[index],
            status: "valid",
        }));
        const { data, error } = await this.supabase
            .from(TICKETS_TABLE)
            .insert(records)
            .select("*")
            .returns<TicketRow[]>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return (data ?? []).map(mapTicket);
    }

    async deleteTicketsByOrder(orderId: string) {
        const { error } = await this.supabase
            .from(TICKETS_TABLE)
            .delete()
            .eq("order_id", orderId);

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }
    }

    async listAdminOrders(query: AdminTicketOrderListQuery) {
        const from = (query.page - 1) * query.limit;
        const to = from + query.limit - 1;
        let request = this.supabase
            .from(TICKET_ORDERS_TABLE)
            .select("*", { count: "exact" });

        if (query.status) {
            request = request.eq("status", query.status);
        }

        if (query.event_id) {
            request = request.eq("event_id", query.event_id);
        }

        const { data, error, count } = await request
            .order("created_at", { ascending: false })
            .range(from, to)
            .returns<TicketOrderRow[]>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        const total = count ?? 0;

        return {
            items: (data ?? []).map(mapTicketOrder),
            pagination: {
                page: query.page,
                limit: query.limit,
                total,
                total_pages: Math.ceil(total / query.limit),
            },
        };
    }

    async findOrderById(orderId: string) {
        const { data, error } = await this.supabase
            .from(TICKET_ORDERS_TABLE)
            .select("*")
            .eq("id", orderId)
            .maybeSingle<TicketOrderRow>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return data ? mapTicketOrder(data) : null;
    }

    async findOrderByPaymentRef(paymentRef: string) {
        const { data, error } = await this.supabase
            .from(TICKET_ORDERS_TABLE)
            .select("*")
            .eq("payment_ref", paymentRef)
            .maybeSingle<TicketOrderRow>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return data ? mapTicketOrder(data) : null;
    }

    async updateOrderStatus(orderId: string, status: "pending" | "paid" | "refunded") {
        const { data, error } = await this.supabase
            .from(TICKET_ORDERS_TABLE)
            .update({ status })
            .eq("id", orderId)
            .select("*")
            .single<TicketOrderRow>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return mapTicketOrder(data);
    }

    async listTicketsByOrder(orderId: string, onlyIssued = false) {
        let request = this.supabase
            .from(TICKETS_TABLE)
            .select("*")
            .eq("order_id", orderId);

        if (onlyIssued) {
            request = request.not("ticket_code", "like", "LOCK_%");
        }

        const { data, error } = await request
            .order("created_at", { ascending: true })
            .returns<TicketRow[]>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return (data ?? []).map(mapTicket);
    }

    async increaseTierSold(tierId: string, quantity: number) {
        const tier = await this.findTierById(tierId);

        if (!tier) {
            throw new AuthException(404, "TICKET_TIER_NOT_FOUND");
        }

        if (tier.quantity - tier.sold < quantity) {
            throw new AuthException(409, "TICKET_INSUFFICIENT_INVENTORY");
        }

        const { error } = await this.supabase
            .from(TICKET_TIERS_TABLE)
            .update({ sold: tier.sold + quantity })
            .eq("id", tierId);

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }
    }

    async issuePendingOrderTickets(tickets: Array<{ id: string }>) {
        const issuedTickets = await Promise.all(tickets.map(async (ticket) => {
            const { data, error } = await this.supabase
                .from(TICKETS_TABLE)
                .update({
                    ticket_code: createTicketCode(),
                })
                .eq("id", ticket.id)
                .eq("status", "valid")
                .select("*")
                .single<TicketRow>();

            if (error) {
                throw new AuthException(500, "DATABASE_ERROR", error.message);
            }

            return mapTicket(data);
        }));

        return issuedTickets;
    }

    async listMineTickets(userId: string, query: TicketListQuery) {
        const from = (query.page - 1) * query.limit;
        const to = from + query.limit - 1;
        let request = this.supabase
            .from(TICKETS_TABLE)
            .select("*, ticket_orders!inner(status), events(slug, title, event_date, start_time, thumbnail_url)", { count: "exact" })
            .eq("user_id", userId)
            .eq("ticket_orders.status", "paid")
            .not("ticket_code", "like", "LOCK_%");

        if (query.status) {
            request = request.eq("status", query.status);
        }

        const { data, error, count } = await request
            .order("created_at", { ascending: false })
            .range(from, to)
            .returns<Array<TicketRow & { events: { slug: string; title: string; event_date: string; start_time: string; thumbnail_url: string | null } | null }>>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        const total = count ?? 0;

        return {
            items: (data ?? []).map(mapTicket),
            pagination: {
                page: query.page,
                limit: query.limit,
                total,
                total_pages: Math.ceil(total / query.limit),
            },
        };
    }

    async findIssuedTicketByCode(code: string) {
        const { data, error } = await this.supabase
            .from(TICKETS_TABLE)
            .select("*, ticket_orders!inner(status)")
            .eq("ticket_code", code)
            .eq("ticket_orders.status", "paid")
            .maybeSingle<TicketRow>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return data ? mapTicket(data) : null;
    }

    async checkInTicket(code: string) {
        const { data, error } = await this.supabase
            .from(TICKETS_TABLE)
            .update({
                status: "used",
                checked_in_at: new Date().toISOString(),
            })
            .eq("ticket_code", code)
            .eq("status", "valid")
            .select("*")
            .maybeSingle<TicketRow>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return data ? mapTicket(data) : null;
    }

    private async findTierById(tierId: string) {
        const { data, error } = await this.supabase
            .from(TICKET_TIERS_TABLE)
            .select("*")
            .eq("id", tierId)
            .maybeSingle<TicketTierSaleRow>();

        if (error) {
            throw new AuthException(500, "DATABASE_ERROR", error.message);
        }

        return data;
    }
}

function createTicketCode() {
    return `TICKET_${crypto.randomUUID().replace(/-/g, "").toUpperCase()}`;
}
