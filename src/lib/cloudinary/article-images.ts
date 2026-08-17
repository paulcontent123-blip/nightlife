import { createHash } from "crypto";
import type { UploadApiOptions, UploadApiResponse } from "cloudinary";
import cloudinary from "@/config/cloudinary";
import { AuthException } from "@/modules/auth/auth.errors";

const MAX_ARTICLE_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

export interface UploadedArticleImage {
    url: string;
    public_id: string;
    width: number;
    height: number;
    format: string;
    bytes: number;
    fingerprint: string;
}

export async function uploadArticleImage(file: File): Promise<UploadedArticleImage> {
    validateArticleImage(file);

    const buffer = Buffer.from(await file.arrayBuffer());
    const fingerprint = createArticleImageFingerprint(buffer);
    const result = await uploadBuffer(buffer, {
        folder: "nightlife/articles/content",
        resource_type: "image",
        public_id: fingerprint,
        use_filename: false,
        unique_filename: false,
        overwrite: true,
    });

    return {
        url: result.secure_url,
        public_id: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes,
        fingerprint,
    };
}

function validateArticleImage(file: File) {
    if (!file.type.startsWith("image/")) {
        throw new AuthException(422, "INVALID_ARTICLE_IMAGE");
    }

    if (file.size > MAX_ARTICLE_IMAGE_SIZE_BYTES) {
        throw new AuthException(422, "INVALID_ARTICLE_IMAGE", "Article image must be 10MB or smaller");
    }
}

function createArticleImageFingerprint(buffer: Buffer) {
    return createHash("sha256").update(buffer).digest("hex");
}

function uploadBuffer(buffer: Buffer, options: UploadApiOptions) {
    return new Promise<UploadApiResponse>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
            if (error || !result) {
                reject(error ?? new Error("Cloudinary upload failed"));
                return;
            }

            resolve(result);
        });

        stream.end(buffer);
    }).catch((error) => {
        const message = readCloudinaryErrorMessage(error);

        throw new AuthException(502, "ARTICLE_IMAGE_UPLOAD_FAILED", message);
    });
}

function readCloudinaryErrorMessage(error: unknown): string | undefined {
    if (error instanceof Error) {
        return error.message;
    }

    if (error && typeof error === "object" && "message" in error) {
        const message = (error as { message?: unknown }).message;

        return typeof message === "string" && message.trim().length > 0
            ? message
            : undefined;
    }

    return undefined;
}
