import type { Metadata } from "next";
import { buildGalleryMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;

    return buildGalleryMetadata(slug);
}

export default function GalleryAlbumLayout({ children }: { children: React.ReactNode }) {
    return children;
}
