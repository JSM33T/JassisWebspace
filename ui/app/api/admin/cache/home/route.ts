import { NextRequest, NextResponse } from "next/server";

import { type CacheTagMeta } from "@/lib/home-content.types";
import { ensureAdminRequest } from "@/lib/server/admin-auth";
import {
    HOME_BLOGS_TAG,
    HOME_GALLERIES_TAG,
    getHomeCacheTagsMeta,
    revalidateAndWarmHomeCacheTag,
} from "@/lib/server/home-content-cache";
import {
    MUSIC_TRACKS_TAG,
    getMusicCacheTagsMeta,
    revalidateAndWarmMusicCacheTag,
} from "@/lib/server/music-content-cache";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    try {
        const auth = await ensureAdminRequest(request);
        if (!auth.ok) {
            return NextResponse.json({ message: auth.message }, { status: auth.status });
        }

        const [homeTags, musicTags] = await Promise.all([
            getHomeCacheTagsMeta(),
            getMusicCacheTagsMeta(),
        ]);
        const tags = [...homeTags, ...musicTags];
        return NextResponse.json({ tags });
    } catch (error) {
        console.error("Failed to load cache metadata:", error);
        return NextResponse.json(
            { message: "Failed to load cache metadata." },
            { status: 500 },
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const auth = await ensureAdminRequest(request);
        if (!auth.ok) {
            return NextResponse.json({ message: auth.message }, { status: auth.status });
        }

        const body = await request.json().catch(() => null);
        const tag = body && typeof body === "object" && "tag" in body
            ? String((body as { tag?: unknown }).tag || "")
            : "";

        if (!tag) {
            return NextResponse.json(
                { message: "Tag is required." },
                { status: 400 },
            );
        }

        let meta: CacheTagMeta;
        if (tag === HOME_GALLERIES_TAG || tag === HOME_BLOGS_TAG) {
            meta = await revalidateAndWarmHomeCacheTag(tag);
        } else if (tag === MUSIC_TRACKS_TAG) {
            meta = await revalidateAndWarmMusicCacheTag(tag);
        } else {
            return NextResponse.json(
                { message: `Unsupported cache tag: ${tag}` },
                { status: 400 },
            );
        }

        const [homeTags, musicTags] = await Promise.all([
            getHomeCacheTagsMeta(),
            getMusicCacheTagsMeta(),
        ]);
        const tags = [...homeTags, ...musicTags];
        return NextResponse.json({
            message: `Cache revalidated for tag: ${tag}`,
            revalidatedAt: new Date().toISOString(),
            meta,
            tags,
        });
    } catch (error) {
        console.error("Failed to revalidate cache:", error);
        return NextResponse.json(
            { message: "Failed to revalidate cache." },
            { status: 500 },
        );
    }
}
