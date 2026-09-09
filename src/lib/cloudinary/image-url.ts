const CLOUDINARY_UPLOAD_PATH = "/image/upload/";
const VENUE_CARD_TRANSFORMATION = "f_auto,q_auto,c_fill,w_640,h_360";

export function getOptimizedCloudinaryImageUrl(url: string | null) {
    if (!url) {
        return null;
    }

    const uploadIndex = url.indexOf(CLOUDINARY_UPLOAD_PATH);

    if (uploadIndex < 0) {
        return url;
    }

    const prefixEnd = uploadIndex + CLOUDINARY_UPLOAD_PATH.length;
    const pathAfterUpload = url.slice(prefixEnd);
    const firstPathSegment = pathAfterUpload.split("/")[0] ?? "";

    if (firstPathSegment.includes("f_auto") || firstPathSegment.includes("q_auto")) {
        return url;
    }

    return `${url.slice(0, prefixEnd)}${VENUE_CARD_TRANSFORMATION}/${pathAfterUpload}`;
}
