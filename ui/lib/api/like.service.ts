import { apiClient } from './client';

export const likeService = {
    toggleLike: async (contentId: string): Promise<boolean> => {
        return await apiClient.post<boolean>(`/likes/${contentId}`);
    },

    getLikeCount: async (contentId: string): Promise<number> => {
        return await apiClient.get<number>(`/likes/${contentId}/count`);
    }
};
