import { NextRequest, NextResponse } from "next/server";

import { ensureAdminRequest } from "@/lib/server/admin-auth";
import {
    getHomeCacheTagsMeta,
    revalidateAndWarmHomeCacheTag,
} from "@/lib/server/home-content-cache";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    try {
        const auth = await ensureAdminRequest(request);
        if (!auth.ok) {
            return NextResponse.json({ message: auth.message }, { status: auth.status });
        }

        const tags = await getHomeCacheTagsMeta();
        return NextResponse.json({ tags });
    } catch (error) {
        console.error("Failed to load home cache meta:", error);
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

        const meta = await revalidateAndWarmHomeCacheTag(tag);
        const tags = await getHomeCacheTagsMeta();
        return NextResponse.json({
            message: `Cache revalidated for tag: ${tag}`,
            revalidatedAt: new Date().toISOString(),
            meta,
            tags,
        });
    } catch (error) {
        console.error("Failed to revalidate home cache:", error);
        return NextResponse.json(
            { message: "Failed to revalidate cache." },
            { status: 500 },
        );
    }
}
