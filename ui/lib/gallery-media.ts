import { type Album, type AlbumWithImages } from "@/lib/api/gallery.types";
import { applyCacheBustingParam } from "@/lib/cacheBust";

type GalleryCoverSource = Pick<Album, "cover" | "createdAt" | "updatedAt">
    | Pick<AlbumWithImages, "cover" | "createdAt" | "updatedAt">;

export function getVersionedGalleryCoverUrl(album: GalleryCoverSource): string | undefined {
    return applyCacheBustingParam(album.cover, album.updatedAt || album.createdAt);
}

export function toGalleryThumbUrl(url: string): string {
    const transformed = transformMediaPath(url, "/media/", "/media/thumb/");
    return transformed ?? url;
}

function transformMediaPath(url: string, marker: string, replacement: string): string | null {
    try {
        const hasScheme = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(url);
        const base = hasScheme
            ? undefined
            : typeof window !== "undefined"
                ? window.location.origin
                : "http://localhost";

        const parsed = new URL(url, base);
        const idx = parsed.pathname.indexOf(marker);
        if (idx === -1) {
            return null;
        }

        const prefix = parsed.pathname.slice(0, idx);
        const rest = parsed.pathname.slice(idx + marker.length);
        if (rest.startsWith("thumb/")) {
            return url;
        }

        parsed.pathname = `${prefix}${replacement}${rest}`;

        const result = parsed.toString();
        if (!hasScheme && base) {
            return result.replace(base, "");
        }

        return result;
    } catch {
        return transformMediaPathManually(url, marker, replacement);
    }
}

function transformMediaPathManually(url: string, marker: string, replacement: string): string | null {
    const hashIndex = url.indexOf("#");
    const hash = hashIndex >= 0 ? url.slice(hashIndex) : "";
    const withoutHash = hashIndex >= 0 ? url.slice(0, hashIndex) : url;

    const queryIndex = withoutHash.indexOf("?");
    const query = queryIndex >= 0 ? withoutHash.slice(queryIndex) : "";
    const path = queryIndex >= 0 ? withoutHash.slice(0, queryIndex) : withoutHash;

    const idx = path.indexOf(marker);
    if (idx === -1) {
        return null;
    }

    const prefix = path.slice(0, idx);
    const rest = path.slice(idx + marker.length);
    if (rest.startsWith("thumb/")) {
        return url;
    }

    return `${prefix}${replacement}${rest}${query}${hash}`;
}
