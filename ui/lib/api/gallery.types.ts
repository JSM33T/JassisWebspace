// Gallery API Types
export interface Album {
    id: string;
    name: string;
    slug: string;
    cover: string | null;
    description: string | null;
    createdAt: string;
    updatedAt: string | null;
    imageCount: number;
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
    name: string;
    slug: string;
    cover: string | null;
    description: string | null;
    createdAt: string;
    updatedAt: string | null;
    images: Image[];
}

export interface CreateAlbumRequest {
    name: string;
    slug?: string;
    description?: string;
}

export interface AddImageRequest {
    url: string;
    title?: string;
    description?: string;
    order: number;
}
