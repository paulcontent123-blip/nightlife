import { createHash } from "crypto";
import type { UploadApiOptions, UploadApiResponse } from "cloudinary";
import cloudinary from "@/config/cloudinary";
import { AuthException } from "@/modules/auth/auth.errors";

const MAX_VENUE_PHOTO_SIZE_BYTES = 10 * 1024 * 1024;

export interface UploadedVenuePhoto {
    url: string;
    public_id: string;
    width: number;
    height: number;
    format: string;
    bytes: number;
    fingerprint: string;
}

export async function uploadVenuePhoto(venueId: string, file: File): Promise<UploadedVenuePhoto> {
    validateVenuePhoto(file);

    const buffer = Buffer.from(await file.arrayBuffer());
    const fingerprint = createVenuePhotoFingerprint(buffer);
    const result = await uploadBuffer(buffer, {
        folder: `nightlife/venues/${venueId}`,
        resource_type: "image",
        public_id: fingerprint,
        use_filename: false,
        unique_filename: false,
        overwrite: false,
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

export async function readVenuePhotoFingerprint(file: File): Promise<string> {
    validateVenuePhoto(file);

    return createVenuePhotoFingerprint(Buffer.from(await file.arrayBuffer()));
}

export function readVenuePhotoFingerprintFromUrl(url: string): string | null {
    const publicId = readCloudinaryPublicId(url);
    const fingerprint = publicId?.split("/").at(-1);

    return fingerprint && /^[a-f0-9]{64}$/.test(fingerprint) ? fingerprint : null;
}

export async function deleteVenuePhotoByUrl(url: string): Promise<boolean> {
    const publicId = readCloudinaryPublicId(url);

    if (!publicId) {
        return false;
    }

    try {
        await cloudinary.uploader.destroy(publicId, {
            resource_type: "image",
        });

        return true;
    } catch {
        return false;
    }
}

function validateVenuePhoto(file: File) {
    if (!file.type.startsWith("image/")) {
        throw new AuthException(422, "INVALID_VENUE_IMAGE");
    }

    if (file.size > MAX_VENUE_PHOTO_SIZE_BYTES) {
        throw new AuthException(422, "INVALID_VENUE_IMAGE", "Venue photo must be 10MB or smaller");
    }
}

function createVenuePhotoFingerprint(buffer: Buffer) {
    return createHash("sha256").update(buffer).digest("hex");
}

function uploadBuffer(
    buffer: Buffer,
    options: UploadApiOptions
) {
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

        throw new AuthException(502, "CLOUDINARY_UPLOAD_FAILED", message);
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

function readCloudinaryPublicId(url: string): string | null {
    let pathname: string;

    try {
        pathname = new URL(url).pathname;
    } catch {
        return null;
    }

    const uploadMarker = "/image/upload/";
    const uploadIndex = pathname.indexOf(uploadMarker);

    if (uploadIndex === -1) {
        return null;
    }

    const pathAfterUpload = pathname.slice(uploadIndex + uploadMarker.length);
    const pathWithoutVersion = pathAfterUpload.replace(/^v\d+\//, "");
    const pathWithoutExtension = pathWithoutVersion.replace(/\.[a-zA-Z0-9]+$/, "");

    return pathWithoutExtension.length > 0 ? decodeURIComponent(pathWithoutExtension) : null;
}
