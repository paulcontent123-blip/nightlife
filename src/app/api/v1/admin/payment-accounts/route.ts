import { requireAdmin } from "@/modules/auth/auth.guard";
import { failure, readJson, success } from "@/modules/auth/auth.response";
import { BankTransferService } from "@/modules/bank-transfer/bank-transfer.service";

const bankTransferService = new BankTransferService();

export async function GET() {
    try {
        await requireAdmin();

        return success(await bankTransferService.listAccounts());
    } catch (error) {
        return failure(error);
    }
}

export async function POST(request: Request) {
    try {
        await requireAdmin();
        const data = await bankTransferService.createAccount(await readJson(request));

        return success(data, 201);
    } catch (error) {
        return failure(error);
    }
}
