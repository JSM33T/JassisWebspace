export interface AdminChatTranscriptMessage {
    role: string;
    content: string;
}

export interface AdminChatSummary {
    id: string;
    userId: string | null;
    username: string | null;
    email: string | null;
    visitorId: string | null;
    ownerDisplay: string;
    messageCount: number;
    preview: string | null;
    model: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface AdminChatDetail {
    id: string;
    userId: string | null;
    username: string | null;
    email: string | null;
    visitorId: string | null;
    ownerDisplay: string;
    model: string | null;
    createdAt: string;
    updatedAt: string;
    messages: AdminChatTranscriptMessage[];
}

export interface AdminChatListParams {
    search?: string;
    page?: number;
    pageSize?: number;
}
