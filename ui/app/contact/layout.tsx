import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
    title: "Contact",
    description: "Contact JassSpace for project collaboration, service requests, or technical support.",
    tags: ["contact", "project inquiry", "service inquiry", "JassSpace"],
    canonicalPath: "/contact",
});

export default function ContactLayout({ children }: { children: React.ReactNode }) {
    return children;
}
