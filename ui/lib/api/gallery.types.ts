// Gallery API Types
export interface GalleryAuthor {
    userId: string;
    username: string;
    displayName: string | null;
    order: number;
}

export interface Album {
    id: string;
    contentId: string | null;
    name: string;
    slug: string;
    cover: string | null;
    description: string | null;
    isActive: boolean;
    sortOrder: number;
    createdAt: string;
    updatedAt: string | null;
    imageCount: number;
    authors: GalleryAuthor[];
}

export interface Image {
    id: string;
    albumId: string;
    url: string;
    title: string | null;
    description: string | null;
    order: number;
    createdAt: string;
}

export interface AlbumWithImages {
    id: string;
    contentId: string | null;
    likeCount: number;
    isLiked: boolean;
    commentCount: number;
    viewCount: number;
    name: string;
    slug: string;
    cover: string | null;
    description: string | null;
    isActive: boolean;
    sortOrder: number;
    createdAt: string;
    updatedAt: string | null;
    images: Image[];
    authors: GalleryAuthor[];
}

export interface CreateAlbumRequest {
    name: string;
    slug?: string;
    description?: string;
    authorIds?: string[];
    isActive?: boolean;
    sortOrder?: number;
}

export interface AddImageRequest {
    url: string;
    title?: string;
    description?: string;
    order: number;
}

export interface GalleryAuditMissingEntry {
    kind: "cover" | "image";
    id: string;
    name: string | null;
    storedUrl: string;
    expectedBlobName: string;
}

export interface GalleryAuditResult {
    totalAlbums: number;
    totalImages: number;
    totalBlobsInAzure: number;
    missingFromBlob: GalleryAuditMissingEntry[];
    orphanedBlobs: string[];
}
