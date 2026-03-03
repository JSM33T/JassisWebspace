import { NextResponse } from "next/server";

import { getMusicContentCached } from "@/lib/server/music-content-cache";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const payload = await getMusicContentCached();
        return NextResponse.json(payload);
    } catch (error) {
        console.error("Failed to load cached music content:", error);
        return NextResponse.json(
            { message: "Failed to load music content." },
            { status: 500 },
        );
    }
}
