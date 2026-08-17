"use client";

import { useRef, useState } from "react";
import { clientFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/envelope";
import type { Venue } from "@/lib/api/types";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";

export function VenuePhotoManager({ venueId, initialMedia }: { venueId: string; initialMedia: Venue["media"] }) {
    const [media, setMedia] = useState(initialMedia);
    const [uploading, setUploading] = useState(false);
    const [busyUrl, setBusyUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    async function refresh() {
        const venue = await clientFetch<Venue>(`/api/v1/admin/venues/${venueId}`);
        setMedia(venue.media);
    }

    async function handleUpload(files: FileList | null) {
        if (!files || files.length === 0) {
            return;
        }

        setUploading(true);
        setError(null);

        try {
            const formData = new FormData();

            Array.from(files).forEach((file) => formData.append("images", file));
            formData.append("set_thumbnail", media.thumbnail_url ? "false" : "true");

            await clientFetch(`/api/v1/admin/venues/${venueId}/photos`, {
                method: "POST",
                body: formData,
            });
            await refresh();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Không tải ảnh lên được.");
        } finally {
            setUploading(false);

            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    }

    async function setThumbnail(url: string) {
        setBusyUrl(url);
        setError(null);

        try {
            await clientFetch(`/api/v1/admin/venues/${venueId}`, {
                method: "PATCH",
                body: JSON.stringify({ media: { thumbnail_url: url } }),
            });
            await refresh();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Không đặt được ảnh đại diện.");
        } finally {
            setBusyUrl(null);
        }
    }

    async function removeImage(url: string) {
        setBusyUrl(url);
        setError(null);

        try {
            const nextImages = media.images.filter((image) => image !== url);
            const nextThumbnail = media.thumbnail_url === url ? nextImages[0] ?? null : media.thumbnail_url;

            await clientFetch(`/api/v1/admin/venues/${venueId}`, {
                method: "PATCH",
                body: JSON.stringify({ media: { images: nextImages, thumbnail_url: nextThumbnail } }),
            });
            await refresh();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Không xoá được ảnh.");
        } finally {
            setBusyUrl(null);
        }
    }

    return (
        <div className="flex flex-col gap-3">
            {error && <Alert>{error}</Alert>}

            {media.images.length === 0 ? (
                <p className="text-sm text-muted">Chưa có ảnh nào.</p>
            ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {media.images.map((url) => (
                        <div key={url} className="group relative overflow-hidden rounded-lg border border-border-strong">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={url} alt="" className="h-24 w-full object-cover" />
                            {media.thumbnail_url === url && (
                                <span className="absolute left-1.5 top-1.5 rounded bg-amber px-1.5 py-0.5 text-[10px] font-bold text-void">
                                    Đại diện
                                </span>
                            )}
                            <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-black/70 px-1.5 py-1 opacity-0 transition-opacity group-hover:opacity-100">
                                <button
                                    type="button"
                                    disabled={busyUrl === url}
                                    onClick={() => setThumbnail(url)}
                                    className="text-[10px] font-semibold text-amber disabled:opacity-50"
                                >
                                    Đặt đại diện
                                </button>
                                <button
                                    type="button"
                                    disabled={busyUrl === url}
                                    onClick={() => removeImage(url)}
                                    className="text-[10px] font-semibold text-pink disabled:opacity-50"
                                >
                                    Xoá
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <label className="flex h-10 w-fit cursor-pointer items-center gap-2 rounded-lg border-[1.5px] border-dashed border-border-heavy px-4 text-xs font-semibold text-muted hover:border-amber hover:text-amber">
                {uploading ? <Spinner /> : "+ Tải ảnh lên"}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    disabled={uploading}
                    className="hidden"
                    onChange={(event) => handleUpload(event.target.files)}
                />
            </label>
        </div>
    );
}
