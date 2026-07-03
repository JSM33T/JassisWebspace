import { apiClient } from "./client";
import {
    AdminDevelopmentSuggestionParams,
    CreateDevelopmentNoteRequest,
    DevelopmentNote,
    DevelopmentSuggestion,
    PromoteDevelopmentSuggestionRequest,
    UpdateDevelopmentNoteRequest,
    UpdateDevelopmentSuggestionRequest,
    UpdateDevelopmentSuggestionStatusRequest,
} from "./development.types";
import { normalizeDevelopmentSuggestion } from "./development.service";

type ApiDevelopmentSuggestion = DevelopmentSuggestion & {
    gitHubIssueNumber?: number | null;
    gitHubIssueUrl?: string | null;
};

export const adminDevelopmentService = {
    async getSuggestions(params?: AdminDevelopmentSuggestionParams): Promise<DevelopmentSuggestion[]> {
        const query = new URLSearchParams();
        if (params?.status) query.set("status", params.status);
        if (params?.page) query.set("page", String(params.page));
        if (params?.pageSize) query.set("pageSize", String(params.pageSize));

        const suggestions = await apiClient.get<ApiDevelopmentSuggestion[]>(`/admin/development/suggestions?${query.toString()}`);
        return suggestions.map(normalizeDevelopmentSuggestion);
    },

    async updateSuggestionStatus(id: string, status: UpdateDevelopmentSuggestionStatusRequest): Promise<DevelopmentSuggestion> {
        const suggestion = await apiClient.put<ApiDevelopmentSuggestion, UpdateDevelopmentSuggestionStatusRequest>(
            `/admin/development/suggestions/${id}/status`,
            status
        );
        return normalizeDevelopmentSuggestion(suggestion);
    },

    async updateSuggestion(id: string, request: UpdateDevelopmentSuggestionRequest): Promise<DevelopmentSuggestion> {
        const suggestion = await apiClient.put<ApiDevelopmentSuggestion, UpdateDevelopmentSuggestionRequest>(
            `/admin/development/suggestions/${id}`,
            request
        );
        return normalizeDevelopmentSuggestion(suggestion);
    },

    async promoteSuggestion(id: string, request: PromoteDevelopmentSuggestionRequest): Promise<DevelopmentSuggestion> {
        const suggestion = await apiClient.post<ApiDevelopmentSuggestion, PromoteDevelopmentSuggestionRequest>(
            `/admin/development/suggestions/${id}/promote`,
            request
        );
        return normalizeDevelopmentSuggestion(suggestion);
    },

    async closePromotedIssue(id: string): Promise<DevelopmentSuggestion> {
        const suggestion = await apiClient.post<ApiDevelopmentSuggestion, undefined>(
            `/admin/development/suggestions/${id}/close-issue`
        );
        return normalizeDevelopmentSuggestion(suggestion);
    },

    async deleteSuggestion(id: string): Promise<void> {
        await apiClient.delete<void>(`/admin/development/suggestions/${id}`);
    },

    async getNotes(): Promise<DevelopmentNote[]> {
        return apiClient.get<DevelopmentNote[]>("/admin/development/notes");
    },

    async createNote(request: CreateDevelopmentNoteRequest): Promise<DevelopmentNote> {
        return apiClient.post<DevelopmentNote, CreateDevelopmentNoteRequest>("/admin/development/notes", request);
    },

    async updateNote(id: string, request: UpdateDevelopmentNoteRequest): Promise<DevelopmentNote> {
        return apiClient.put<DevelopmentNote, UpdateDevelopmentNoteRequest>(`/admin/development/notes/${id}`, request);
    },

    async deleteNote(id: string): Promise<void> {
        await apiClient.delete<void>(`/admin/development/notes/${id}`);
    },
};
