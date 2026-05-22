import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
    title: "Uses",
    description: "Tools, gear, and software I use day to day — editor, languages, infrastructure, and hardware.",
    tags: ["uses", "tools", "gear", "setup", "developer setup"],
    canonicalPath: "/uses",
});

export default function UsesLayout({ children }: { children: React.ReactNode }) {
    return children;
}
