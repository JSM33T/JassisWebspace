import { apiClient } from "./client";
import {
    CreateDevelopmentSuggestionRequest,
    DevelopmentIssue,
    DevelopmentIssueParams,
    DevelopmentListParams,
    DevelopmentReleasesWall,
    DevelopmentSuggestion,
    DevelopmentSummary,
} from "./development.types";

type ApiDevelopmentSuggestion = DevelopmentSuggestion & {
    gitHubIssueNumber?: number | null;
    gitHubIssueUrl?: string | null;
};

type ApiDevelopmentSummary = Omit<DevelopmentSummary, "suggestions"> & {
    suggestions: ApiDevelopmentSuggestion[];
};

function appendPaging(query: URLSearchParams, params?: DevelopmentListParams) {
    if (params?.page) query.set("page", String(params.page));
    if (params?.pageSize) query.set("pageSize", String(params.pageSize));
}

export function normalizeDevelopmentSuggestion(suggestion: ApiDevelopmentSuggestion): DevelopmentSuggestion {
    return {
        ...suggestion,
        githubIssueNumber: suggestion.githubIssueNumber ?? suggestion.gitHubIssueNumber ?? null,
        githubIssueUrl: suggestion.githubIssueUrl ?? suggestion.gitHubIssueUrl ?? null,
    };
}

export const developmentService = {
    async getSummary(): Promise<DevelopmentSummary> {
        const summary = await apiClient.get<ApiDevelopmentSummary>("/development/summary");
        return {
            ...summary,
            suggestions: summary.suggestions.map(normalizeDevelopmentSuggestion),
        };
    },

    async getIssues(params?: DevelopmentIssueParams): Promise<DevelopmentIssue[]> {
        const query = new URLSearchParams();
        if (params?.state) query.set("state", params.state);
        if (params?.label) query.set("label", params.label);
        if (params?.milestone) query.set("milestone", params.milestone);
        if (params?.search) query.set("search", params.search);
        appendPaging(query, params);

        return apiClient.get<DevelopmentIssue[]>(`/development/issues?${query.toString()}`);
    },

    async getReleases(params?: DevelopmentListParams): Promise<DevelopmentReleasesWall> {
        const query = new URLSearchParams();
        appendPaging(query, params);

        return apiClient.get<DevelopmentReleasesWall>(`/development/releases?${query.toString()}`);
    },

    async getSuggestions(params?: DevelopmentListParams): Promise<DevelopmentSuggestion[]> {
        const query = new URLSearchParams();
        appendPaging(query, params);

        const suggestions = await apiClient.get<ApiDevelopmentSuggestion[]>(`/development/suggestions?${query.toString()}`);
        return suggestions.map(normalizeDevelopmentSuggestion);
    },

    async createSuggestion(request: CreateDevelopmentSuggestionRequest): Promise<DevelopmentSuggestion> {
        const suggestion = await apiClient.post<ApiDevelopmentSuggestion, CreateDevelopmentSuggestionRequest>(
            "/development/suggestions",
            request
        );
        return normalizeDevelopmentSuggestion(suggestion);
    },
};
