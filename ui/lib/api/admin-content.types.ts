export type ContentType = "Album" | "Blog" | "Video" | "Music";

export interface AdminContentBase {
    id: string;
    title: string;
    slug: string;
    contentType: ContentType;
    isPublished: boolean;
    publishedAt: string | null;
    createdAt: string;
    updatedAt: string | null;
    linkCount: number;
    commentCount: number;
    likeCount: number;
    viewCount: number;
    lastActivityAt: string;
}

export type AdminContentListItem = AdminContentBase;

export type AdminContentSortBy = "lastActivity" | "createdAt" | "updatedAt";
export type AdminContentSortDir = "asc" | "desc";

export interface AdminContentListParams {
    contentType?: ContentType;
    sortBy?: AdminContentSortBy;
    sortDir?: AdminContentSortDir;
    dateFrom?: string;
    dateTo?: string;
}

export interface AdminContentUserSummary {
    userId: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
}

export interface AdminContentDetail extends AdminContentBase {
    likedBy: AdminContentUserSummary[];
    commentedBy: AdminContentUserSummary[];
}
