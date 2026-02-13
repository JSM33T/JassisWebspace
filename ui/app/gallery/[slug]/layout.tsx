import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
    return buildMetadata({
        title: "Gallery Album",
        description: "Explore this gallery album on JassSpace.",
        tags: ["gallery", "album", "images", "JassSpace"],
        canonicalPath: `/gallery/${params.slug}`,
    });
}

export default function GalleryAlbumLayout({ children }: { children: React.ReactNode }) {
    return children;
}
