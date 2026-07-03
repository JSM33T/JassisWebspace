import { apiClient } from "./client";

export interface PublicUser {
    id: string;
    username: string;
    firstName?: string | null;
    lastName?: string | null;
    displayName?: string | null;
    avatarUrl?: string | null;
    coverUrl?: string | null;
    bio?: string | null;
    verifiedBadge: boolean;
    createdAt: string;
    updatedAt: string;
    roles: string[];
}

export const userService = {
    async getPublicUser(username: string): Promise<PublicUser> {
        return apiClient.get<PublicUser>(`/user/${encodeURIComponent(username)}/public`);
    },
};

