import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;

    return buildMetadata({
        title: "Blog Article",
        description: "Read this JassSpace blog article.",
        tags: ["blog", "article", "JassSpace"],
        canonicalPath: `/blog/${slug}`,
        type: "article",
    });
}

export default function BlogArticleLayout({ children }: { children: React.ReactNode }) {
    return children;
}
