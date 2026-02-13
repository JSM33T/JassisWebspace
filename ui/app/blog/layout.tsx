import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
    title: "Blog",
    description: "Explore the latest JassSpace articles, tutorials, and technical insights.",
    tags: ["blog", "tutorials", "engineering insights", "JassSpace"],
    canonicalPath: "/blog",
});

export default function BlogLayout({ children }: { children: React.ReactNode }) {
    return children;
}
