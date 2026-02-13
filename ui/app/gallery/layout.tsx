import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
    title: "Gallery",
    description: "Explore albums and visual showcases from JassSpace.",
    tags: ["gallery", "albums", "images", "creative showcase"],
    canonicalPath: "/gallery",
});

export default function GalleryLayout({ children }: { children: React.ReactNode }) {
    return children;
}
