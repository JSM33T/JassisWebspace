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
