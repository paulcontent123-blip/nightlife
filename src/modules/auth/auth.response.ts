import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuthException } from "./auth.errors";

export function success<T>(data: T, status = 200) {
    return NextResponse.json(
        {
            success: true,
            data,
        },
        { status }
    );
}

export function failure(error: unknown) {
    if (error instanceof ZodError) {
        return NextResponse.json(
            {
                success: false,
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Invalid request payload",
                    issues: error.issues,
                },
            },
            { status: 422 }
        );
    }

    if (error instanceof AuthException) {
        return NextResponse.json(
            {
                success: false,
                error: {
                    code: error.code,
                    message: error.message,
                },
            },
            { status: error.status }
        );
    }

    const fallbackMessage = "Internal server error";
    const message = readErrorField(error, "message") ?? fallbackMessage;
    const details = readErrorField(error, "details");
    const hint = readErrorField(error, "hint");

    return NextResponse.json(
        {
            success: false,
            error: {
                code: "INTERNAL_ERROR",
                message,
                ...(details ? { details } : {}),
                ...(hint ? { hint } : {}),
            },
        },
        { status: 500 }
    );
}

export async function readJson<T>(request: Request): Promise<T> {
    const text = await request.text();

    if (!text) {
        return {} as T;
    }

    try {
        return JSON.parse(text) as T;
    } catch {
        throw new AuthException(400, "INVALID_JSON");
    }
}

function readErrorField(error: unknown, field: string): string | undefined {
    if (error instanceof Error && field === "message") {
        return error.message;
    }

    if (!error || typeof error !== "object" || !(field in error)) {
        return undefined;
    }

    const value = (error as Record<string, unknown>)[field];

    return typeof value === "string" && value.trim().length > 0
        ? value
        : undefined;
}
