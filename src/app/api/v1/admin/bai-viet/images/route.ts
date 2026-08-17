import { requireAdmin } from "@/modules/auth/auth.guard";
import { AuthException } from "@/modules/auth/auth.errors";
import { failure, success } from "@/modules/auth/auth.response";
import { uploadArticleImage } from "@/lib/cloudinary/article-images";

export const runtime = "nodejs";

export async function POST(request: Request) {
    try {
        await requireAdmin();
        const formData = await request.formData();
        const file = readArticleImageFile(formData);
        const alt = readAltText(formData, file);
        const image = await uploadArticleImage(file);

        return success({
            ...image,
            alt,
            markdown: `![${escapeMarkdownAlt(alt)}](${image.url})`,
        }, 201);
    } catch (error) {
        return failure(error);
    }
}

function readArticleImageFile(formData: FormData) {
    const supportedKeys = new Set(["image", "file", "images"]);
    const file = [...formData.entries()]
        .filter(([key]) => supportedKeys.has(key.trim()))
        .map(([, value]) => value)
        .find((value): value is File => value instanceof File && value.size > 0);

    if (!file) {
        throw new AuthException(422, "INVALID_ARTICLE_IMAGE", "Upload one article image using image or file");
    }

    return file;
}

function readAltText(formData: FormData, file: File) {
    const value = formData.get("alt");

    if (typeof value === "string" && value.trim().length > 0) {
        return value.trim().slice(0, 160);
    }

    return file.name.replace(/\.[a-zA-Z0-9]+$/, "").replace(/[-_]+/g, " ").slice(0, 160);
}

function escapeMarkdownAlt(value: string) {
    return value.replace(/[[\]\\]/g, "");
}
