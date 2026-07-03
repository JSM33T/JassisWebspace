import { apiClient } from './client';

export interface ContentViewResponse {
    contentId: string;
    viewCount: number;
    viewedAt: string;
}

export const viewService = {
    recordView: async (contentId: string): Promise<ContentViewResponse> => {
        return await apiClient.post<ContentViewResponse>(`/views/${contentId}`);
    },
};
