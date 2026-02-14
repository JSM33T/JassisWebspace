import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;

    return buildMetadata({
        title: "Music Track",
        description: "Listen to this track on JassSpace.",
        tags: ["music", "track", "audio", "JassSpace"],
        canonicalPath: `/music/${slug}`,
        type: "article",
    });
}

export default function MusicTrackLayout({ children }: { children: React.ReactNode }) {
    return children;
}
