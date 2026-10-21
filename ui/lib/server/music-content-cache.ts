import "server-only";

import { revalidateTag, unstable_cache } from "next/cache";

import { type MusicTrack } from "@/lib/api/music.types";
import { type CacheTagMeta } from "@/lib/home-content.types";
import { type MusicContentPayload } from "@/lib/music-content.types";
import { apiBaseUrl, CONTENT_FETCH_TIMEOUT_MS, isExpired, parseApiData, parseTtl, type TaggedResult } from "@/lib/server/cache-utils";

export const MUSIC_TRACKS_TAG = "music-tracks-feed";

export const MUSIC_TRACKS_TTL_SECONDS = parseTtl(
    process.env.MUSIC_TRACKS_REVALIDATE_SECONDS,
    864000,
);

async function fetchTracks(): Promise<MusicTrack[]> {
    try {
        const params = new URLSearchParams({ page: "1", pageSize: "100" });
        const response = await fetch(`${apiBaseUrl()}/music/tracks?${params.toString()}`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            signal: AbortSignal.timeout(CONTENT_FETCH_TIMEOUT_MS),
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch music tracks (${response.status})`);
        }

        const tracks = await parseApiData<MusicTrack[]>(response);
        if (!Array.isArray(tracks)) throw new Error("Music tracks response is not a list");
        return tracks;
    } catch (error) {
        console.error("Music feed fetch failed:", error);
        throw error;
    }
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
    ["music-tracks-cache-v2", process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? ""],
    {
        revalidate: MUSIC_TRACKS_TTL_SECONDS,
        tags: [MUSIC_TRACKS_TAG],
    },
);

let lastTracks: TaggedResult<MusicTrack> | null = null;

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
    try {
        const tracks = await getCachedMusicTracks();
        lastTracks = tracks;
        return { tracks: tracks.items, status: isExpired(tracks) ? "cached" : "available" };
    } catch (error) {
        console.error("Music feed unavailable:", error);
        return {
            tracks: lastTracks?.items ?? [],
            status: lastTracks ? "cached" : "unavailable",
        };
    }
}

export async function getMusicCacheTagsMeta(): Promise<CacheTagMeta[]> {
    const tracks = await getCachedMusicTracks();
    return [toCacheTagMeta(tracks)];
}

export async function revalidateAndWarmMusicCacheTag(tag: string): Promise<CacheTagMeta> {
    if (tag !== MUSIC_TRACKS_TAG) {
        throw new Error(`Unsupported cache tag: ${tag}`);
    }

    revalidateTag(MUSIC_TRACKS_TAG, { expire: 0 });
    const refreshed = await getCachedMusicTracks();
    return toCacheTagMeta(refreshed);
}
