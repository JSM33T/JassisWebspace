
import { apiClient } from './client';
import { CommentResponse, CreateCommentRequest, UpdateCommentRequest } from './comment.types';

type ApiCommentResponse = Omit<CommentResponse, 'displayName' | 'avatarUrl'> & {
    displayName?: string | null;
    avatarUrl?: string | null;
    userDisplayName?: string | null;
    userAvatar?: string | null;
};

const normalizeComment = (comment: ApiCommentResponse): CommentResponse => {
    return {
        ...comment,
        displayName: comment.displayName ?? comment.userDisplayName ?? undefined,
        avatarUrl: comment.avatarUrl ?? comment.userAvatar ?? undefined,
    };
};

export const commentService = {
    getComments: async (contentId: string): Promise<CommentResponse[]> => {
        const comments = await apiClient.get<ApiCommentResponse[]>(`/comments/${contentId}`);
        return comments.map(normalizeComment);
    },

    createComment: async (data: CreateCommentRequest): Promise<CommentResponse> => {
        const comment = await apiClient.post<ApiCommentResponse>('/comments', data);
        return normalizeComment(comment);
    },

    updateComment: async (id: string, data: UpdateCommentRequest): Promise<CommentResponse> => {
        const comment = await apiClient.put<ApiCommentResponse>(`/comments/${id}`, data);
        return normalizeComment(comment);
    },

    deleteComment: async (id: string): Promise<void> => {
        await apiClient.delete(`/comments/${id}`);
    }
};
