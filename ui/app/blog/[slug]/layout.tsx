import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
    return buildMetadata({
        title: "Blog Article",
        description: "Read this JassSpace blog article.",
        tags: ["blog", "article", "JassSpace"],
        canonicalPath: `/blog/${params.slug}`,
        type: "article",
    });
}

export default function BlogArticleLayout({ children }: { children: React.ReactNode }) {
    return children;
}
