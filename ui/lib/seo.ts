import type { Metadata } from "next";

export type SeoOverride = {
    title?: string;
    description?: string;
    tags?: string[];
    image?: string;
    canonicalPath?: string;
    canonicalUrl?: string;
    type?: "website" | "article";
    noIndex?: boolean;
};

const SITE_NAME = "JassSpace";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://jassi.me";
const SEO_API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

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
    const canonicalUrl = overrides.canonicalUrl
        || `${SEO_DEFAULTS.siteUrl}${overrides.canonicalPath || ""}`;
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

type SeoApiEnvelope<T> = {
    data?: T;
};

type BlogSeoPayload = {
    title: string;
    description: string;
    canonicalUrl: string;
    image?: string | null;
    tags?: string[];
    type?: "website" | "article";
    noIndex?: boolean;
};

export async function buildBlogMetadata(slug: string): Promise<Metadata> {
    const fallback = buildMetadata({
        title: "Blog Article",
        description: "Read this JassSpace blog article.",
        tags: ["blog", "article", "JassSpace"],
        canonicalPath: `/blog/${slug}`,
        type: "article",
    });

    if (!slug) {
        return fallback;
    }

    try {
        const baseUrl = SEO_API_BASE_URL.replace(/\/$/, "");
        const endpoint = `${baseUrl}/seo/blog/${encodeURIComponent(slug)}`;
        const response = await fetch(endpoint, {
            method: "GET",
            headers: { Accept: "application/json" },
            next: { revalidate: 600 },
        });

        if (!response.ok) {
            return fallback;
        }

        const payload = (await response.json()) as SeoApiEnvelope<BlogSeoPayload>;
        if (!payload?.data?.title || !payload.data.canonicalUrl) {
            return fallback;
        }

        return buildMetadata({
            title: payload.data.title,
            description: payload.data.description || fallback.description?.toString(),
            tags: payload.data.tags,
            image: payload.data.image || undefined,
            canonicalUrl: payload.data.canonicalUrl,
            type: payload.data.type === "article" ? "article" : "website",
            noIndex: payload.data.noIndex ?? false,
        });
    } catch {
        return fallback;
    }
}

export function buildMetadata(overrides: SeoOverride = {}): Metadata {
    const seo = resolveSeo(overrides);
    const canonicalOrigin = extractOrigin(seo.canonicalUrl) || SEO_DEFAULTS.siteUrl;
    const imageUrl = seo.image.startsWith("http")
        ? seo.image
        : `${canonicalOrigin}${seo.image.startsWith("/") ? "" : "/"}${seo.image}`;

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

function extractOrigin(url: string): string | null {
    try {
        return new URL(url).origin;
    } catch {
        return null;
    }
}
