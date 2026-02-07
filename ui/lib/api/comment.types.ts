
export interface CommentResponse {
    id: string;
    contentId: string;
    parentCommentId: string | null;
    text: string;
    userId: string;
    username: string;
    displayName?: string;
    avatarUrl?: string;
    replyCount: number;
    createdAt: string;
    updatedAt: string;
}

export interface CreateCommentRequest {
    contentId: string;
    parentCommentId?: string;
    text: string;
}

export interface UpdateCommentRequest {
    text: string;
}

export interface CommentNode extends CommentResponse {
    children: CommentNode[];
}
