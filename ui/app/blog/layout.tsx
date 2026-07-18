import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
    title: "Blog",
    description: "Read Jassi's implementation notes, platform refactors, debugging stories, product thinking, and field essays.",
    tags: ["blog", "engineering notes", "debugging stories", "product thinking", "JassSpace"],
    canonicalPath: "/blog",
});

export default function BlogLayout({ children }: { children: React.ReactNode }) {
    return children;
}
