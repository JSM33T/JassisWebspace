import { apiClient } from "./client";
import { AdminChatDetail, AdminChatListParams, AdminChatSummary } from "./admin-chat.types";

export const adminChatService = {
    async getChats(params?: AdminChatListParams): Promise<AdminChatSummary[]> {
        const query = new URLSearchParams();
        if (params?.search) query.append("search", params.search);
        if (params?.page) query.append("page", params.page.toString());
        if (params?.pageSize) query.append("pageSize", params.pageSize.toString());

        return await apiClient.get<AdminChatSummary[]>(`/admin/chats?${query.toString()}`);
    },

    async getChat(id: string): Promise<AdminChatDetail> {
        return await apiClient.get<AdminChatDetail>(`/admin/chats/${id}`);
    },

    async deleteChat(id: string): Promise<void> {
        await apiClient.delete<void>(`/admin/chats/${id}`);
    },
};
