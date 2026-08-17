import { NextRequest, NextResponse } from "next/server";
import { createSiteUrl } from "@/config/site";
import { AuthService } from "@/modules/auth/auth.service";
import { failure, success } from "@/modules/auth/auth.response";
import { AuthException } from "@/modules/auth/auth.errors";

const authService = new AuthService();

export async function GET(request: NextRequest) {
    try {
        const code = request.nextUrl.searchParams.get("code");
        const next = request.nextUrl.searchParams.get("next");

        if (!code) {
            throw new AuthException(400, "OAUTH_FAILED", "Missing OAuth code");
        }

        const data = await authService.handleOAuthCallback(code);

        if (next?.startsWith("/")) {
            return NextResponse.redirect(createSiteUrl(next));
        }

        return NextResponse.redirect(createSiteUrl(data.redirect_to));
    } catch (error) {
        return failure(error);
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json() as { code?: string };

        if (!body.code) {
            throw new AuthException(400, "OAUTH_FAILED", "Missing OAuth code");
        }

        const data = await authService.handleOAuthCallback(body.code);

        return success(data);
    } catch (error) {
        return failure(error);
    }
}
