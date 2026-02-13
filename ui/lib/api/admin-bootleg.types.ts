export interface BootlegUploadResponse {
    assetId: string;
    folder: string;
    fileName: string;
    blobName: string;
    sizeBytes: number;
    streamUrl: string;
    token: string;
    expiresAt: string;
}

export interface BootlegAsset {
    id: string;
    folder: string;
    fileName: string;
    blobName: string;
    contentType: string;
    sizeBytes: number;
    createdAt: string;
    streamUrl: string;
    expiresAt: string;
}

export interface BootlegLinkResponse {
    streamUrl: string;
    token: string;
    expiresAt: string;
}
