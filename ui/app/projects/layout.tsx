import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
    title: "Projects",
    description: "Explore Jassi's engineering projects across self-hosted infrastructure, automation, AI workflows, media systems, and developer tools.",
    tags: ["projects", "engineering portfolio", "automation", "AI workflows", "self-hosted infrastructure"],
    canonicalPath: "/projects",
});

export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
    return children;
}
