export type DevelopmentSuggestionStatus = "pending" | "approved" | "rejected" | "archived" | "promoted";

export interface DevelopmentIssue {
    number: number;
    title: string;
    state: string;
    url: string;
    body: string | null;
    labels: string[];
    milestone: string | null;
    assignee: string | null;
    createdAt: string;
    updatedAt: string;
    closedAt: string | null;
}

export interface DevelopmentRelease {
    id: number;
    tagName: string;
    name: string;
    body: string | null;
    url: string;
    isDraft: boolean;
    isPrerelease: boolean;
    createdAt: string;
    publishedAt: string | null;
}

export interface DevelopmentSuggestion {
    id: string;
    title: string;
    body: string;
    status: DevelopmentSuggestionStatus;
    userId: string;
    username: string;
    userDisplayName: string | null;
    githubIssueNumber: number | null;
    githubIssueUrl: string | null;
    createdAt: string;
    updatedAt: string | null;
    reviewedAt: string | null;
}

export interface DevelopmentNote {
    id: string;
    title: string;
    body: string;
    version: string | null;
    category: string;
    isPublished: boolean;
    publishedAt: string | null;
    createdAt: string;
    updatedAt: string | null;
}

export interface DevelopmentSummary {
    openIssueCount: number;
    closedIssueCount: number;
    latestIssues: DevelopmentIssue[];
    latestReleases: DevelopmentRelease[];
    notes: DevelopmentNote[];
    suggestions: DevelopmentSuggestion[];
}

export interface DevelopmentReleasesWall {
    releases: DevelopmentRelease[];
    notes: DevelopmentNote[];
}

export interface DevelopmentIssueParams {
    state?: "open" | "closed" | "all";
    label?: string;
    milestone?: string;
    search?: string;
    page?: number;
    pageSize?: number;
}

export interface DevelopmentListParams {
    page?: number;
    pageSize?: number;
}

export interface CreateDevelopmentSuggestionRequest {
    title: string;
    body: string;
}

export interface AdminDevelopmentSuggestionParams extends DevelopmentListParams {
    status?: DevelopmentSuggestionStatus | "all";
}

export interface UpdateDevelopmentSuggestionStatusRequest {
    status: DevelopmentSuggestionStatus;
}

export interface PromoteDevelopmentSuggestionRequest {
    title?: string;
    body?: string;
}

export interface UpdateDevelopmentSuggestionRequest {
    title: string;
    body: string;
    status: DevelopmentSuggestionStatus;
}

export interface CreateDevelopmentNoteRequest {
    title: string;
    body: string;
    version?: string | null;
    category: string;
    isPublished: boolean;
    publishedAt?: string | null;
}

export type UpdateDevelopmentNoteRequest = CreateDevelopmentNoteRequest;
