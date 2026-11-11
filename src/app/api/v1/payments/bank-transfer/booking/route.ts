import { requireAuth } from "@/modules/auth/auth.guard";
import { failure, readJson, success } from "@/modules/auth/auth.response";
import { BankTransferService } from "@/modules/bank-transfer/bank-transfer.service";

const bankTransferService = new BankTransferService();

// Switches a pending booking deposit to bank transfer and returns the payment page URL.
export async function POST(request: Request) {
    try {
        const user = await requireAuth();
        const data = await bankTransferService.createForBooking(await readJson(request), user);

        return success(data, 201);
    } catch (error) {
        return failure(error);
    }
}
