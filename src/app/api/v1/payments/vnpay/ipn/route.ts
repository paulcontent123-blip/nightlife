import { failure, readJson, success } from "@/modules/auth/auth.response";
import { PaymentService } from "@/modules/payments/payment.service";
import type { PaymentIpnDTO } from "@/modules/payments/payment.types";

const paymentService = new PaymentService();

export async function POST(request: Request) {
    try {
        const data = await paymentService.handleMockIpn(
            "vnpay",
            await readJson<PaymentIpnDTO>(request)
        );

        return success(data);
    } catch (error) {
        return failure(error);
    }
}
