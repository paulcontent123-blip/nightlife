import { failure, readJson, success } from "@/modules/auth/auth.response";
import { BarTourService } from "@/modules/bar-tour/bar-tour.service";
import type { BarTourRecommendationDTO } from "@/modules/bar-tour/bar-tour.types";

const barTourService = new BarTourService();

export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const data = await barTourService.recommendFromSearchParams(url.searchParams);

        return success(data);
    } catch (error) {
        return failure(error);
    }
}

export async function POST(request: Request) {
    try {
        const data = await barTourService.recommendFromBody(
            await readJson<BarTourRecommendationDTO>(request)
        );

        return success(data);
    } catch (error) {
        return failure(error);
    }
}
