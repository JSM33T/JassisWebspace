import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
    title: "About",
    description: "Learn about JassSpace mission, values, and the team behind our products.",
    tags: ["about JassSpace", "mission", "team", "product engineering"],
    canonicalPath: "/about",
});

export default function AboutLayout({ children }: { children: React.ReactNode }) {
    return children;
}
