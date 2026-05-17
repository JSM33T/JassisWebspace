import "server-only";

import { revalidateTag, unstable_cache } from "next/cache";

import { type BlogListItem } from "@/lib/api/blog.types";
import { type Album } from "@/lib/api/gallery.types";
import { type CacheTagMeta, type HomeContentPayload } from "@/lib/home-content.types";

export const HOME_GALLERIES_TAG = "home-galleries-feed";
export const HOME_BLOGS_TAG = "home-blogs-feed";

function parseTtl(value: string | undefined, fallback: number): number {
    const parsed = Number.parseInt(value || "", 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
    return parsed;
}

const defaultTtl = parseTtl(process.env.HOME_CONTENT_REVALIDATE_SECONDS, 86400);
export const HOME_GALLERIES_TTL_SECONDS = parseTtl(
    process.env.HOME_GALLERIES_REVALIDATE_SECONDS,
    defaultTtl,
);
export const HOME_BLOGS_TTL_SECONDS = parseTtl(
    process.env.HOME_BLOGS_REVALIDATE_SECONDS,
    defaultTtl,
);

function apiBaseUrl(): string {
    const value = (process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL)?.replace(/\/$/, "");
    if (!value) {
        throw new Error("NEXT_PUBLIC_API_URL is not configured");
    }
    return value;
}

async function parseApiData<T>(response: Response): Promise<T> {
    const payload = await response.json().catch(() => null);
    if (payload && typeof payload === "object" && "data" in payload) {
        return (payload as { data: T }).data;
    }
    return payload as T;
}

async function fetchAlbums(): Promise<Album[]> {
    const response = await fetch(`${apiBaseUrl()}/gallery/albums`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch gallery albums (${response.status})`);
    }

    return parseApiData<Album[]>(response);
}

async function fetchBlogs(): Promise<BlogListItem[]> {
    const response = await fetch(`${apiBaseUrl()}/blog`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch blogs (${response.status})`);
    }

    return parseApiData<BlogListItem[]>(response);
}

interface TaggedResult<T> {
    key: string;
    label: string;
    description: string;
    tag: string;
    ttlSeconds: number;
    generatedAt: string;
    total: number;
    items: T[];
}

const getCachedHomeGalleries = unstable_cache(
    async (): Promise<TaggedResult<Album>> => {
        const albums = await fetchAlbums();
        const galleries = [...albums]
            .sort(
                (a, b) =>
                    a.sortOrder - b.sortOrder ||
                    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
            )
            .slice(0, 5);

        return {
            key: "home-galleries",
            label: "Home Galleries",
            description: "Recent 5 gallery cards shown on the homepage.",
            tag: HOME_GALLERIES_TAG,
            ttlSeconds: HOME_GALLERIES_TTL_SECONDS,
            generatedAt: new Date().toISOString(),
            total: albums.length,
            items: galleries,
        };
    },
    ["home-galleries-cache-v1"],
    {
        revalidate: HOME_GALLERIES_TTL_SECONDS,
        tags: [HOME_GALLERIES_TAG],
    },
);

const getCachedHomeBlogs = unstable_cache(
    async (): Promise<TaggedResult<BlogListItem>> => {
        const blogs = await fetchBlogs();
        const latestBlogs = [...blogs]
            .sort(
                (a, b) =>
                    new Date(b.publishedAt || b.createdAt).getTime() -
                    new Date(a.publishedAt || a.createdAt).getTime(),
            )
            .slice(0, 4);

        return {
            key: "home-blogs",
            label: "Home Blogs",
            description: "Recent 4 blog cards shown on the homepage.",
            tag: HOME_BLOGS_TAG,
            ttlSeconds: HOME_BLOGS_TTL_SECONDS,
            generatedAt: new Date().toISOString(),
            total: blogs.length,
            items: latestBlogs,
        };
    },
    ["home-blogs-cache-v1"],
    {
        revalidate: HOME_BLOGS_TTL_SECONDS,
        tags: [HOME_BLOGS_TAG],
    },
);

function toCacheTagMeta<T>(entry: TaggedResult<T>): CacheTagMeta {
    const generatedMs = new Date(entry.generatedAt).getTime();
    const expiresMs = generatedMs + entry.ttlSeconds * 1000;

    return {
        key: entry.key,
        label: entry.label,
        description: entry.description,
        tag: entry.tag,
        ttlSeconds: entry.ttlSeconds,
        generatedAt: entry.generatedAt,
        expiresAt: new Date(expiresMs).toISOString(),
        isExpired: Date.now() > expiresMs,
        itemCount: entry.total,
    };
}

export async function getHomeContentCached(): Promise<HomeContentPayload> {
    const [galleriesResult, blogsResult] = await Promise.allSettled([
        getCachedHomeGalleries(),
        getCachedHomeBlogs(),
    ]);
    const galleries = galleriesResult.status === "fulfilled" ? galleriesResult.value : null;
    const blogs = blogsResult.status === "fulfilled" ? blogsResult.value : null;

    return {
        galleries: galleries?.items ?? [],
        galleryTotal: galleries?.total ?? 0,
        blogs: blogs?.items ?? [],
        blogTotal: blogs?.total ?? 0,
    };
}

export async function getHomeCacheTagsMeta(): Promise<CacheTagMeta[]> {
    const [galleries, blogs] = await Promise.all([getCachedHomeGalleries(), getCachedHomeBlogs()]);
    return [toCacheTagMeta(galleries), toCacheTagMeta(blogs)];
}

export async function revalidateAndWarmHomeCacheTag(tag: string): Promise<CacheTagMeta> {
    if (tag === HOME_GALLERIES_TAG) {
        revalidateTag(HOME_GALLERIES_TAG, "max");
        const refreshed = await getCachedHomeGalleries();
        return toCacheTagMeta(refreshed);
    }

    if (tag === HOME_BLOGS_TAG) {
        revalidateTag(HOME_BLOGS_TAG, "max");
        const refreshed = await getCachedHomeBlogs();
        return toCacheTagMeta(refreshed);
    }

    throw new Error(`Unsupported cache tag: ${tag}`);
}

