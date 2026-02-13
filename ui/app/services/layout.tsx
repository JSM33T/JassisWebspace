import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
    title: "Services",
    description: "Explore JassSpace services including web development, AI, automation, DevOps, and consulting.",
    tags: ["services", "web development", "AI", "automation", "consulting"],
    canonicalPath: "/services",
});

export default function ServicesLayout({ children }: { children: React.ReactNode }) {
    return children;
}
