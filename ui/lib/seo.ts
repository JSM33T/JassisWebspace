import type { Metadata } from "next";

export type SeoOverride = {
    title?: string;
    description?: string;
    tags?: string[];
    image?: string;
    canonicalPath?: string;
    type?: "website" | "article";
    noIndex?: boolean;
};

const SITE_NAME = "JassSpace";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://jassspace.com";

export const SEO_DEFAULTS = {
    siteName: SITE_NAME,
    siteUrl: SITE_URL,
    title: "JassSpace - Build something amazing",
    description: "The modern platform for building scalable applications.",
    tags: [
        "JassSpace",
        "web development",
        "software services",
        "portfolio",
        "gallery",
        "blog",
    ],
    image: "/vercel.svg",
    type: "website" as const,
};

type ResolvedSeo = {
    title: string;
    description: string;
    tags: string[];
    image: string;
    canonicalUrl: string;
    type: "website" | "article";
    noIndex: boolean;
};

export function resolveSeo(overrides: SeoOverride = {}): ResolvedSeo {
    const title = overrides.title
        ? `${overrides.title} | ${SEO_DEFAULTS.siteName}`
        : SEO_DEFAULTS.title;

    const description = overrides.description || SEO_DEFAULTS.description;
    const tags = overrides.tags?.length ? overrides.tags : SEO_DEFAULTS.tags;
    const image = overrides.image || SEO_DEFAULTS.image;
    const canonicalUrl = `${SEO_DEFAULTS.siteUrl}${overrides.canonicalPath || ""}`;
    const type = overrides.type || SEO_DEFAULTS.type;
    const noIndex = overrides.noIndex || false;

    return {
        title,
        description,
        tags,
        image,
        canonicalUrl,
        type,
        noIndex,
    };
}

export function buildMetadata(overrides: SeoOverride = {}): Metadata {
    const seo = resolveSeo(overrides);
    const imageUrl = seo.image.startsWith("http")
        ? seo.image
        : `${SEO_DEFAULTS.siteUrl}${seo.image}`;

    return {
        title: seo.title,
        description: seo.description,
        keywords: seo.tags,
        alternates: {
            canonical: seo.canonicalUrl,
        },
        openGraph: {
            type: seo.type,
            title: seo.title,
            description: seo.description,
            url: seo.canonicalUrl,
            siteName: SEO_DEFAULTS.siteName,
            images: [{ url: imageUrl }],
        },
        twitter: {
            card: "summary_large_image",
            title: seo.title,
            description: seo.description,
            images: [imageUrl],
        },
        robots: seo.noIndex
            ? {
                index: false,
                follow: false,
            }
            : {
                index: true,
                follow: true,
            },
    };
}
