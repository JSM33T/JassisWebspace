import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
    title: "Music",
    description: "Listen to Jassi's remixes, originals, snippets, radio features, collaborations, and audio experiments.",
    tags: ["music", "remixes", "original tracks", "audio experiments", "JassSpace"],
    canonicalPath: "/music",
});

export default function MusicLayout({ children }: { children: React.ReactNode }) {
    return children;
}
