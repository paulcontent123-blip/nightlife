import { requireAuth } from "@/modules/auth/auth.guard";
import { failure, success } from "@/modules/auth/auth.response";
import { BankTransferService } from "@/modules/bank-transfer/bank-transfer.service";

const bankTransferService = new BankTransferService();

// GET ?purpose=booking|ticket_order|membership&ref=NL...
// Transfer instructions (account, amount, content, VietQR) for the caller's own payment.
export async function GET(request: Request) {
    try {
        const user = await requireAuth();
        const url = new URL(request.url);
        const data = await bankTransferService.getInstructions(
            Object.fromEntries(url.searchParams),
            user
        );

        return success(data);
    } catch (error) {
        return failure(error);
    }
}
