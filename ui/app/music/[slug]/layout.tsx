import type { Metadata } from "next";
import { buildMusicMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;

    return buildMusicMetadata(slug);
}

export default function MusicTrackLayout({ children }: { children: React.ReactNode }) {
    return children;
}
