import { unwrapResponse } from "./envelope";

// Browser-side fetch helper for Client Components: mutations (login, register,
// create booking, admin actions, ...) hit this app's own /api/v1 routes and the
// browser attaches cookies automatically for same-origin requests.
export async function clientFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
    const isFormData = typeof FormData !== "undefined" && init.body instanceof FormData;
    const response = await fetch(path, {
        ...init,
        headers: {
            ...(init.body && !isFormData ? { "Content-Type": "application/json" } : {}),
            ...init.headers,
        },
        credentials: "same-origin",
    });

    return unwrapResponse<T>(response);
}
