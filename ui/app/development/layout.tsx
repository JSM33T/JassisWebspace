import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
    title: "Development",
    description: "Follow the public JassSpace development wall with roadmap items, open issues, reviewed suggestions, releases, and project notes.",
    tags: ["development", "roadmap", "release notes", "issues", "JassSpace"],
    canonicalPath: "/development",
});

export default function DevelopmentLayout({ children }: { children: React.ReactNode }) {
    return children;
}
