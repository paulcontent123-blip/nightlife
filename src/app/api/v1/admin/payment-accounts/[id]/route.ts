import { requireAdmin } from "@/modules/auth/auth.guard";
import { failure, readJson, success } from "@/modules/auth/auth.response";
import { BankTransferService } from "@/modules/bank-transfer/bank-transfer.service";

interface RouteContext {
    params: Promise<{
        id: string;
    }>;
}

const bankTransferService = new BankTransferService();

// Body: { is_active: boolean }. Activating an account deactivates the others.
export async function PATCH(request: Request, context: RouteContext) {
    try {
        await requireAdmin();
        const { id } = await context.params;
        const data = await bankTransferService.updateAccount(id, await readJson(request));

        return success(data);
    } catch (error) {
        return failure(error);
    }
}

export async function DELETE(_request: Request, context: RouteContext) {
    try {
        await requireAdmin();
        const { id } = await context.params;

        return success(await bankTransferService.deleteAccount(id));
    } catch (error) {
        return failure(error);
    }
}
