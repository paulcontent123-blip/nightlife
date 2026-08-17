import { requireAuth } from "@/modules/auth/auth.guard";
import { failure, readJson, success } from "@/modules/auth/auth.response";
import { PaymentService } from "@/modules/payments/payment.service";
import type { CreatePaymentDTO } from "@/modules/payments/payment.types";

const paymentService = new PaymentService();

export async function POST(request: Request) {
    try {
        const user = await requireAuth();
        const data = await paymentService.createPayment(
            "momo",
            await readJson<CreatePaymentDTO>(request),
            user
        );

        return success(data, 201);
    } catch (error) {
        return failure(error);
    }
}
