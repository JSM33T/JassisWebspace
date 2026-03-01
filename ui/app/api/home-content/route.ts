import { NextResponse } from "next/server";

import { getHomeContentCached } from "@/lib/server/home-content-cache";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const payload = await getHomeContentCached();
        return NextResponse.json(payload);
    } catch (error) {
        console.error("Failed to load cached home content:", error);
        return NextResponse.json(
            { message: "Failed to load home content." },
            { status: 500 },
        );
    }
}

