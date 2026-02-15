import { get } from "./client";
import { AdminContentDetail, AdminContentListItem, ContentType } from "./admin-content.types";

export type AdminContentSortBy = "lastActivity" | "createdAt" | "updatedAt";
export type AdminContentSortDir = "asc" | "desc";

export interface AdminContentListParams {
    contentType?: ContentType;
    sortBy?: AdminContentSortBy;
    sortDir?: AdminContentSortDir;
}

class AdminContentService {
    async getContents(params?: AdminContentListParams): Promise<AdminContentListItem[]> {
        const query = new URLSearchParams();
        if (params?.contentType) query.append("contentType", params.contentType);
        if (params?.sortBy) query.append("sortBy", params.sortBy);
        if (params?.sortDir) query.append("sortDir", params.sortDir);
        const suffix = query.toString();
        return get<AdminContentListItem[]>(`/admin/content${suffix ? `?${suffix}` : ""}`);
    }

    async getContent(contentId: string): Promise<AdminContentDetail> {
        return get<AdminContentDetail>(`/admin/content/${contentId}`);
    }
}

export const adminContentService = new AdminContentService();
