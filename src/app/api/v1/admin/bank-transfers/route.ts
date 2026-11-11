import { requireAdmin } from "@/modules/auth/auth.guard";
import { failure, success } from "@/modules/auth/auth.response";
import { BankTransferService } from "@/modules/bank-transfer/bank-transfer.service";

const bankTransferService = new BankTransferService();

// Reconciliation queue: every unconfirmed bank-transfer payment.
export async function GET() {
    try {
        await requireAdmin();

        return success(await bankTransferService.listQueue());
    } catch (error) {
        return failure(error);
    }
}
