import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
    title: "Products",
    description: "Explore JassSpace products including ProBeacon, Linqyard, and SurfSwift.",
    tags: ["products", "probeacon", "linqyard", "surfswift", "software"],
    canonicalPath: "/products",
});

export default function ProductsLayout({ children }: { children: React.ReactNode }) {
    return children;
}
