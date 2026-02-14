import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
    title: "FAQ",
    description: "Frequently asked questions about JassSpace.",
    tags: ["faq", "help", "support", "questions"],
    canonicalPath: "/faq",
});

export default function FaqLayout({ children }: { children: React.ReactNode }) {
    return children;
}
