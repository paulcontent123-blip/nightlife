import { requireAdmin } from "@/modules/auth/auth.guard";
import { failure, readJson, success } from "@/modules/auth/auth.response";
import { BankTransferService } from "@/modules/bank-transfer/bank-transfer.service";

const bankTransferService = new BankTransferService();

// Admin could not find the transfer: reset the claim (booking, membership) or cancel the order (tickets).
// Body: { purpose: "booking" | "ticket_order" | "membership", id: uuid }
export async function POST(request: Request) {
    try {
        await requireAdmin();
        const data = await bankTransferService.reject(await readJson(request));

        return success(data);
    } catch (error) {
        return failure(error);
    }
}
