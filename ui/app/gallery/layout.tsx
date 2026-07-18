import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
    title: "Gallery",
    description: "Browse Jassi's photo albums, field walks, travel fragments, ruins, roads, and curated visual stories.",
    tags: ["gallery", "photo albums", "travel photography", "visual archive", "JassSpace"],
    canonicalPath: "/gallery",
});

export default function GalleryLayout({ children }: { children: React.ReactNode }) {
    return children;
}
