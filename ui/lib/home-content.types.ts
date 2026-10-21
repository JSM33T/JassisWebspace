import { type BlogListItem } from "@/lib/api/blog.types";
import { type Album } from "@/lib/api/gallery.types";
import { type FeedStatus } from "@/lib/feed-status";

export interface HomeContentPayload {
    galleries: Album[];
    galleryTotal: number;
    galleryStatus: FeedStatus;
    blogs: BlogListItem[];
    blogTotal: number;
    blogStatus: FeedStatus;
}

export interface CacheTagMeta {
    key: string;
    label: string;
    description: string;
    tag: string;
    ttlSeconds: number;
    generatedAt: string;
    expiresAt: string;
    isExpired: boolean;
    itemCount: number;
}

export interface CacheTagsPayload {
    tags: CacheTagMeta[];
}
