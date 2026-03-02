import { apiClient } from './client';

export interface LikeStatusResponse {
    contentId: string;
    likeCount: number;
    isLiked: boolean;
}

export const likeService = {
    toggleLike: async (contentId: string): Promise<LikeStatusResponse> => {
        return await apiClient.post<LikeStatusResponse>(`/likes/${contentId}`);
    },

    getLikeStatus: async (contentId: string): Promise<LikeStatusResponse> => {
        return await apiClient.get<LikeStatusResponse>(`/likes/${contentId}/status`);
    },

    getLikeCount: async (contentId: string): Promise<number> => {
        return await apiClient.get<number>(`/likes/${contentId}/count`);
    }
};
