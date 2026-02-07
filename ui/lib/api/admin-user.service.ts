import { apiClient } from "./client";
import { AdminUserDetail, AdminUserListItem, AdminUserListParams, UpdateAdminUserRequest, AdminUserDetailsResponse } from "./admin-user.types";

export const adminUserService = {
    async getUsers(params?: AdminUserListParams): Promise<AdminUserListItem[]> {
        const query = new URLSearchParams();
        if (params?.search) query.append("search", params.search);
        if (params?.page) query.append("page", params.page.toString());
        if (params?.pageSize) query.append("pageSize", params.pageSize.toString());

        return await apiClient.get<AdminUserListItem[]>(`/admin/users?${query.toString()}`);
    },

    async getUser(id: string): Promise<AdminUserDetail> {
        const response = await apiClient.get<AdminUserDetailsResponse>(`/admin/users/${id}`);
        return {
            ...response.profile,
            isActive: response.isActive,
            // These missing fields need to be handled if they are important
            externalLoginProviders: [],
            sessionCount: 0,
            hasTwoFactorEnabled: false
        };
    },

    async updateUser(id: string, data: UpdateAdminUserRequest): Promise<AdminUserDetail> {
        const response = await apiClient.put<AdminUserDetailsResponse>(`/admin/users/${id}`, data);
        return {
            ...response.profile,
            isActive: response.isActive,
            externalLoginProviders: [],
            sessionCount: 0,
            hasTwoFactorEnabled: false
        };
    },

    async deleteUser(id: string): Promise<void> {
        await apiClient.delete(`/admin/users/${id}`);
    }
};
