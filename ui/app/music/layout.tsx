import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
    title: "Music",
    description: "Discover music content and audio showcases on JassSpace.",
    tags: ["music", "audio", "tracks", "JassSpace"],
    canonicalPath: "/music",
});

export default function MusicLayout({ children }: { children: React.ReactNode }) {
    return children;
}
