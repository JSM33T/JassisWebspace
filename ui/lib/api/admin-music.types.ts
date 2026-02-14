import { MusicTrack, TrackAuthor, TrackLink } from "./music.types";

export interface TrackAuthorInput {
    userId: string;
    role?: string | null;
}

export interface TrackLinkInput {
    type: string;
    url: string;
    label: string;
    order?: number | null;
}

export interface CreateTrackRequest {
    id?: string;
    title: string;
    slug?: string | null;
    description: string;
    category: string;
    duration?: string | null;
    releaseDate: string;
    genre?: string | null;
    tags?: string[] | null;
    cover?: string | null;
    authors?: TrackAuthorInput[] | null;
    links?: TrackLinkInput[] | null;
    bootlegAssetId?: string | null;
    featured: boolean;
    isPublished: boolean;
}

export type UpdateTrackRequest = Omit<CreateTrackRequest, "id">;

export interface AdminTrackDetail extends MusicTrack {
    likeCount: number;
    isLiked: boolean;
    commentCount: number;
}

export interface TrackCoverUploadResponse {
    publicId: string;
    url: string;
}

export interface TrackAudioUploadResponse {
    assetId: string;
    folder: string;
    fileName: string;
    blobName: string;
    sizeBytes: number;
    streamUrl: string;
    token: string;
    expiresAt: string;
}

export type AdminTrackListItem = MusicTrack;

export type AdminTrackAuthor = TrackAuthor;
export type AdminTrackLink = TrackLink;
