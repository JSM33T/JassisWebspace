export interface Artifact {
    id: string;
    contentId: string;
    title: string;
    originalFileName: string;
    mediaType: string;
    sizeBytes: number;
    ownerUserId: string | null;
    ownerName: string | null;
    createdAt: string;
    updatedAt: string | null;
    activeLinkCount: number;
    totalDownloads: number;
    isPublished: boolean;
}
export interface ArtifactLink {
    id: string;
    expiresAt: string | null;
    maxDownloads: number | null;
    downloadCount: number;
    revokedAt: string | null;
    createdAt: string;
    status: 'Active' | 'Expired' | 'Limit reached' | 'Revoked';
}
export interface ArtifactDetail {
    artifact: Artifact;
    privateNote: string | null;
    links: ArtifactLink[];
    maxUploadBytes: number;
    listing: ArtifactListing;
}
export interface ArtifactListing {
    description: string | null;
    body: string | null;
    category: string | null;
    tags: string[];
    hasCover: boolean;
}
export interface UpdateArtifactListing {
    title: string;
    description: string;
    body: string;
    category: string;
    tags: string[];
    coverImage: File | null;
    removeCover: boolean;
}
export interface ArtifactPage {
    items: Artifact[];
    total: number;
    page: number;
    pageSize: number;
    maxUploadBytes: number;
    ownerQuotaBytes: number;
    owners: { id: string; name: string }[];
}
export interface ArtifactLinkSettings { expiresAt: string | null; maxDownloads: number | null }
export interface ArtifactPublic {
    title: string;
    fileName: string;
    sizeBytes: number;
    expiresAt: string | null;
    remainingDownloads: number | null;
}
export interface ArtifactGrant { grantToken: string; expiresAt: string }

export interface PublicArtifactItem extends Omit<ArtifactListing, 'body'> {
    id: string;
    title: string;
    fileName: string;
    sizeBytes: number;
}

export interface PublicArtifactDetail {
    artifact: PublicArtifactItem;
    body: string | null;
}

export interface PublicArtifactPage {
    items: PublicArtifactItem[];
    total: number;
    page: number;
    pageSize: number;
    categories: string[];
}
