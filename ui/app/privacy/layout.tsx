import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
    title: "Privacy Policy",
    description: "Understand what JassSpace stores in your browser and why.",
    tags: ["privacy policy", "cookies", "localStorage", "data usage"],
    canonicalPath: "/privacy",
});

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
    return children;
}
