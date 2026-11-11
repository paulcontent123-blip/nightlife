import { requireAuth } from "@/modules/auth/auth.guard";
import { failure, readJson, success } from "@/modules/auth/auth.response";
import { BankTransferService } from "@/modules/bank-transfer/bank-transfer.service";

const bankTransferService = new BankTransferService();

// User reports "I have transferred". This never marks the payment as received;
// it only queues the payment for admin reconciliation.
export async function POST(request: Request) {
    try {
        const user = await requireAuth();
        const data = await bankTransferService.claim(await readJson(request), user);

        return success(data);
    } catch (error) {
        return failure(error);
    }
}
