import "server-only";

import { revalidateTag, unstable_cache } from "next/cache";

import { type MusicTrack } from "@/lib/api/music.types";
import { type CacheTagMeta } from "@/lib/home-content.types";
import { type MusicContentPayload } from "@/lib/music-content.types";
import { apiBaseUrl, parseApiData, parseTtl, type TaggedResult } from "@/lib/server/cache-utils";

export const MUSIC_TRACKS_TAG = "music-tracks-feed";

export const MUSIC_TRACKS_TTL_SECONDS = parseTtl(
    process.env.MUSIC_TRACKS_REVALIDATE_SECONDS,
    864000,
);

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
    const tracks = await getCachedMusicTracks().catch(() => null);
    return { tracks: tracks?.items ?? [] };
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
