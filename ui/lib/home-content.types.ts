import { type BlogListItem } from "@/lib/api/blog.types";
import { type Album } from "@/lib/api/gallery.types";

export interface HomeContentPayload {
    galleries: Album[];
    blogs: BlogListItem[];
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
