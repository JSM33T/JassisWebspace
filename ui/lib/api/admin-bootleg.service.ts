import { del, get, post } from "./client";
import { BootlegAsset, BootlegLinkResponse, BootlegUploadResponse } from "./admin-bootleg.types";

class AdminBootlegService {
    async upload(file: File, folder: string): Promise<BootlegUploadResponse> {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", folder);
        return post<BootlegUploadResponse>("/bootleg/upload", formData);
    }

    async getAssets(params?: { folder?: string; search?: string; page?: number; pageSize?: number }): Promise<BootlegAsset[]> {
        const query = new URLSearchParams();
        if (params?.folder) query.append("folder", params.folder);
        if (params?.search) query.append("search", params.search);
        if (params?.page) query.append("page", String(params.page));
        if (params?.pageSize) query.append("pageSize", String(params.pageSize));
        const suffix = query.toString();
        return get<BootlegAsset[]>(`/bootleg/assets${suffix ? `?${suffix}` : ""}`);
    }

    async getFolders(): Promise<string[]> {
        return get<string[]>("/bootleg/assets/folders");
    }

    async generateLink(assetId: string): Promise<BootlegLinkResponse> {
        return post<BootlegLinkResponse>(`/bootleg/assets/${assetId}/link`);
    }

    async deleteAsset(assetId: string): Promise<void> {
        return del<void>(`/bootleg/assets/${assetId}`);
    }
}

export const adminBootlegService = new AdminBootlegService();
