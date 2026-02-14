import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;

    return buildMetadata({
        title: "Gallery Album",
        description: "Explore this gallery album on JassSpace.",
        tags: ["gallery", "album", "images", "JassSpace"],
        canonicalPath: `/gallery/${slug}`,
    });
}

export default function GalleryAlbumLayout({ children }: { children: React.ReactNode }) {
    return children;
}
