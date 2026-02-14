export interface TrackAuthor {
    userId: string;
    username: string;
    displayName: string | null;
    role: string | null;
    order: number;
}

export interface TrackLink {
    type: string;
    url: string;
    label: string;
    order: number;
}

export interface MusicTrack {
    id: string;
    contentId: string | null;
    title: string;
    slug: string;
    description: string;
    authors: TrackAuthor[];
    category: string;
    duration: string | null;
    releaseDate: string;
    genre: string | null;
    tags: string[];
    cover: string | null;
    links: TrackLink[];
    featured: boolean;
    isPublished: boolean;
    publishedAt: string | null;
    createdAt: string;
    updatedAt: string | null;
    hasPlayableSource: boolean;
    bootlegAssetId: string | null;
}

export interface TrackDetail extends MusicTrack {
    likeCount: number;
    isLiked: boolean;
    commentCount: number;
}

export interface TrackPlayLinkResponse {
    streamUrl: string;
    expiresAt: string;
}
