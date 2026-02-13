import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
    title: "Projects",
    description: "Browse selected JassSpace projects and case-study highlights.",
    tags: ["projects", "case studies", "portfolio", "engineering"],
    canonicalPath: "/projects",
});

export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
    return children;
}
