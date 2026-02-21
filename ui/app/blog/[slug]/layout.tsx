import type { Metadata } from "next";
import { buildBlogMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;

    return buildBlogMetadata(slug);
}

export default function BlogArticleLayout({ children }: { children: React.ReactNode }) {
    return children;
}
