import { NextRequest, NextResponse } from "next/server";
import { createSiteUrl } from "@/config/site";
import { AuthService } from "@/modules/auth/auth.service";
import { failure, readJson, success } from "@/modules/auth/auth.response";
import type { GoogleOAuthDTO } from "@/modules/auth/auth.types";

const authService = new AuthService();

export async function GET(request: NextRequest) {
    try {
        const callbackUrl = createSiteUrl("/api/v1/auth/callback");
        const next = request.nextUrl.searchParams.get("next");

        if (next?.startsWith("/")) {
            callbackUrl.searchParams.set("next", next);
        }

        const data = await authService.googleOAuth({}, callbackUrl.toString());

        return NextResponse.redirect(data.url);
    } catch (error) {
        return failure(error);
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await readJson<GoogleOAuthDTO>(request);
        const callbackUrl = createSiteUrl("/api/v1/auth/callback");
        const data = await authService.googleOAuth(body, callbackUrl.toString());

        return success(data);
    } catch (error) {
        return failure(error);
    }
}
