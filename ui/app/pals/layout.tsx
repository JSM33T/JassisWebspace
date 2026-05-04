import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
    title: "Pals",
    description: "People I admire, collaborate with, and learn from.",
    tags: ["people", "collaborators", "friends", "community"],
    canonicalPath: "/pals",
});

export default function PalsLayout({ children }: { children: React.ReactNode }) {
    return children;
}
