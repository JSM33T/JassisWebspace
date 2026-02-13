import { apiClient } from "./client";
import { AdminContactListParams, AdminContactMessage } from "./admin-contact.types";

export const adminContactService = {
    async getMessages(params?: AdminContactListParams): Promise<AdminContactMessage[]> {
        const query = new URLSearchParams();
        if (params?.search) query.append("search", params.search);
        if (params?.page) query.append("page", params.page.toString());
        if (params?.pageSize) query.append("pageSize", params.pageSize.toString());

        return await apiClient.get<AdminContactMessage[]>(`/admin/contact?${query.toString()}`);
    },
};
