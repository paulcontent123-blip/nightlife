export interface ApiSuccessEnvelope<T> {
    success: true;
    data: T;
}

export interface ApiErrorEnvelope {
    success: false;
    error: {
        code: string;
        message: string;
        issues?: unknown;
        details?: string;
        hint?: string;
    };
}

export type ApiEnvelope<T> = ApiSuccessEnvelope<T> | ApiErrorEnvelope;

export class ApiError extends Error {
    status: number;
    code: string;
    issues?: unknown;

    constructor(status: number, code: string, message: string, issues?: unknown) {
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.code = code;
        this.issues = issues;
    }
}

export async function unwrapResponse<T>(response: Response): Promise<T> {
    const text = await response.text();
    let json: ApiEnvelope<T> | null = null;

    if (text) {
        try {
            json = JSON.parse(text) as ApiEnvelope<T>;
        } catch {
            throw new ApiError(
                response.status || 502,
                "INVALID_RESPONSE",
                "Máy chủ trả về dữ liệu không hợp lệ, vui lòng thử lại."
            );
        }
    }

    if (!json || json.success !== true) {
        const error = json && json.success === false ? json.error : null;

        throw new ApiError(
            response.status,
            error?.code ?? "UNKNOWN_ERROR",
            error?.message ?? "Đã có lỗi xảy ra, vui lòng thử lại.",
            error?.issues
        );
    }

    return json.data;
}
