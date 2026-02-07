
import { apiClient } from './client';
import { CommentResponse, CreateCommentRequest, UpdateCommentRequest } from './comment.types';

export const commentService = {
    getComments: async (contentId: string): Promise<CommentResponse[]> => {
        return await apiClient.get<CommentResponse[]>(`/comments/${contentId}`);
    },

    createComment: async (data: CreateCommentRequest): Promise<CommentResponse> => {
        return await apiClient.post<CommentResponse>('/comments', data);
    },

    updateComment: async (id: string, data: UpdateCommentRequest): Promise<CommentResponse> => {
        return await apiClient.put<CommentResponse>(`/comments/${id}`, data);
    },

    deleteComment: async (id: string): Promise<void> => {
        await apiClient.delete(`/comments/${id}`);
    }
};
