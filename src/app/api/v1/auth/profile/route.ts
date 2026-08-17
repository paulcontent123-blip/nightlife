import { AuthService } from "@/modules/auth/auth.service";
import { failure, readJson, success } from "@/modules/auth/auth.response";
import type { UpdateProfileDTO } from "@/modules/auth/auth.types";
import { uploadRateLimit } from "@/middleware/rate-limit";

const authService = new AuthService();

export async function PUT(request: Request) {
    try {
        const contentType = request.headers.get("content-type") ?? "";
        if (contentType.includes("multipart/form-data")) {
            const formData = await request.formData();
            const avatar = formData.get("avatar");
            const payload: UpdateProfileDTO = {
                display_name: readOptionalFormValue(formData, "display_name"),
                full_name: readOptionalFormValue(formData, "full_name"),
                phone: readOptionalFormValue(formData, "phone"),
                city: readOptionalFormValue(formData, "city") as UpdateProfileDTO["city"],
                avatar_url: readOptionalFormValue(formData, "avatar_url"),
            };
            const avatarFile = avatar instanceof File ? avatar : undefined;

            if (avatarFile) {
                const currentUser = await authService.me();
                const rateLimitResponse = await uploadRateLimit(currentUser.id);

                if (rateLimitResponse) {
                    return rateLimitResponse;
                }
            }

            const data = await authService.updateProfile(
                removeEmptyValues(payload),
                avatarFile
            );

            return success(data);
        }

        const body = await readJson<UpdateProfileDTO>(request);
        const data = await authService.updateProfile(body);

        return success(data);
    } catch (error) {
        return failure(error);
    }
}

function readOptionalFormValue(formData: FormData, key: string): string | undefined {
    const value = formData.get(key);

    return typeof value === "string" && value.trim().length > 0
        ? value.trim()
        : undefined;
}

function removeEmptyValues(input: UpdateProfileDTO): UpdateProfileDTO {
    return Object.fromEntries(
        Object.entries(input).filter(([, value]) => value !== undefined)
    ) as UpdateProfileDTO;
}
