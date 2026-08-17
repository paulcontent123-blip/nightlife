import { failure, success } from "@/modules/auth/auth.response";
import { RealtimeService } from "@/modules/realtime/realtime.service";

const realtimeService = new RealtimeService();

export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const data = realtimeService.getChannels(url.searchParams);

        return success(data);
    } catch (error) {
        return failure(error);
    }
}
