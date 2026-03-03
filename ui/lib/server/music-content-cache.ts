import "server-only";

import { revalidateTag, unstable_cache } from "next/cache";

import { type MusicTrack } from "@/lib/api/music.types";
import { type CacheTagMeta } from "@/lib/home-content.types";
import { type MusicContentPayload } from "@/lib/music-content.types";

export const MUSIC_TRACKS_TAG = "music-tracks-feed";

function parseTtl(value: string | undefined, fallback: number): number {
    const parsed = Number.parseInt(value || "", 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
    return parsed;
}

export const MUSIC_TRACKS_TTL_SECONDS = parseTtl(
    process.env.MUSIC_TRACKS_REVALIDATE_SECONDS,
    864000,
);

function apiBaseUrl(): string {
    const value = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
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

async function fetchTracks(): Promise<MusicTrack[]> {
    const params = new URLSearchParams({ page: "1", pageSize: "100" });
    const response = await fetch(`${apiBaseUrl()}/music/tracks?${params.toString()}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch music tracks (${response.status})`);
    }

    return parseApiData<MusicTrack[]>(response);
}

interface TaggedResult<T> {
    key: string;
    label: string;
    description: string;
    tag: string;
    ttlSeconds: number;
    generatedAt: string;
    items: T[];
}

const getCachedMusicTracks = unstable_cache(
    async (): Promise<TaggedResult<MusicTrack>> => {
        const tracks = await fetchTracks();
        return {
            key: "music-tracks",
            label: "Music Tracks",
            description: "Published music tracks feed used on the music listing page.",
            tag: MUSIC_TRACKS_TAG,
            ttlSeconds: MUSIC_TRACKS_TTL_SECONDS,
            generatedAt: new Date().toISOString(),
            items: tracks,
        };
    },
    ["music-tracks-cache-v1"],
    {
        revalidate: MUSIC_TRACKS_TTL_SECONDS,
        tags: [MUSIC_TRACKS_TAG],
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
        itemCount: entry.items.length,
    };
}

export async function getMusicContentCached(): Promise<MusicContentPayload> {
    const tracks = await getCachedMusicTracks();
    return { tracks: tracks.items };
}

export async function getMusicCacheTagsMeta(): Promise<CacheTagMeta[]> {
    const tracks = await getCachedMusicTracks();
    return [toCacheTagMeta(tracks)];
}

export async function revalidateAndWarmMusicCacheTag(tag: string): Promise<CacheTagMeta> {
    if (tag !== MUSIC_TRACKS_TAG) {
        throw new Error(`Unsupported cache tag: ${tag}`);
    }

    revalidateTag(MUSIC_TRACKS_TAG, "max");
    const refreshed = await getCachedMusicTracks();
    return toCacheTagMeta(refreshed);
}
